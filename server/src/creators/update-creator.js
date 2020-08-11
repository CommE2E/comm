// @flow

import {
  type UpdateInfo,
  type UpdateData,
  type RawUpdateInfo,
  type CreateUpdatesResult,
  updateTypes,
} from 'lib/types/update-types';
import type { Viewer } from '../session/viewer';
import type { RawThreadInfo } from 'lib/types/thread-types';
import type { AccountUserInfo, LoggedInUserInfo } from 'lib/types/user-types';
import {
  defaultNumberPerThread,
  type FetchMessageInfosResult,
} from 'lib/types/message-types';
import {
  type RawEntryInfo,
  type FetchEntryInfosResponse,
  type CalendarQuery,
  defaultCalendarQuery,
} from 'lib/types/entry-types';
import {
  type UpdateTarget,
  redisMessageTypes,
  type NewUpdatesRedisMessage,
} from 'lib/types/redis-types';

import invariant from 'invariant';
import _uniq from 'lodash/fp/uniq';
import _intersection from 'lodash/fp/intersection';

import { promiseAll } from 'lib/utils/promises';
import { nonThreadCalendarFilters } from 'lib/selectors/calendar-filter-selectors';
import {
  keyForUpdateData,
  keyForUpdateInfo,
  conditionKeyForUpdateData,
  conditionKeyForUpdateDataFromKey,
  rawUpdateInfoFromUpdateData,
} from 'lib/shared/update-utils';

import { dbQuery, SQL, SQLStatement, mergeAndConditions } from '../database';
import createIDs from './id-creator';
import { deleteUpdatesByConditions } from '../deleters/update-deleters';
import {
  fetchThreadInfos,
  type FetchThreadInfosResult,
} from '../fetchers/thread-fetchers';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import {
  fetchEntryInfos,
  fetchEntryInfosByID,
} from '../fetchers/entry-fetchers';
import {
  fetchKnownUserInfos,
  fetchLoggedInUserInfos,
} from '../fetchers/user-fetchers';
import { channelNameForUpdateTarget, publisher } from '../socket/redis';
import { handleAsyncPromise } from '../responders/handlers';

type UpdatesForCurrentSession =
  // This is the default if no Viewer is passed, or if an isSocket Viewer is
  // passed in. We will broadcast to all valid sessions via Redis and return
  // nothing to the caller, relying on the current session's Redis listener to
  // pick up the updates and deliver them asynchronously.
  | 'broadcast'
  // This is the default if a non-isSocket Viewer is passed in. We avoid
  // broadcasting the update to the current session, and instead return the
  // update to the caller, who will handle delivering it to the client.
  | 'return'
  // This means we ignore any updates destined for the current session.
  // Presumably the caller knows what they are doing and has a different way of
  // communicating the relevant information to the client.
  | 'ignore';

export type ViewerInfo =
  | {|
      viewer: Viewer,
      calendarQuery?: ?CalendarQuery,
      updatesForCurrentSession?: UpdatesForCurrentSession,
    |}
  | {|
      viewer: Viewer,
      calendarQuery: ?CalendarQuery,
      updatesForCurrentSession?: UpdatesForCurrentSession,
      threadInfos: { [id: string]: RawThreadInfo },
      userInfos: { [id: string]: AccountUserInfo },
    |};
const emptyArray = [];
const defaultUpdateCreationResult = { viewerUpdates: [], userInfos: {} };
const sortFunction = (a: UpdateData | UpdateInfo, b: UpdateData | UpdateInfo) =>
  a.time - b.time;

// Creates rows in the updates table based on the inputed updateDatas. Returns
// UpdateInfos pertaining to the provided viewerInfo, as well as related
// UserInfos. If no viewerInfo is provided, no UpdateInfos will be returned. And
// the update row won't have an updater column, meaning no session will be
// excluded from the update.
async function createUpdates(
  updateDatas: $ReadOnlyArray<UpdateData>,
  passedViewerInfo?: ?ViewerInfo,
): Promise<CreateUpdatesResult> {
  if (updateDatas.length === 0) {
    return defaultUpdateCreationResult;
  }

  // viewer.session will throw for a script Viewer
  let viewerInfo = passedViewerInfo;
  if (
    viewerInfo &&
    (viewerInfo.viewer.isScriptViewer || !viewerInfo.viewer.loggedIn)
  ) {
    viewerInfo = null;
  }

  const sortedUpdateDatas = [...updateDatas].sort(sortFunction);

  const filteredUpdateDatas: UpdateData[] = [];
  const keyedUpdateDatas: Map<string, UpdateData[]> = new Map();
  const deleteConditions: Map<string, number[]> = new Map();
  for (let updateData of sortedUpdateDatas) {
    // If we don't end up `continue`ing below, types indicates which
    // update types we should delete for the corresponding key
    let types;
    if (updateData.type === updateTypes.DELETE_ACCOUNT) {
      types = [updateTypes.DELETE_ACCOUNT, updateTypes.UPDATE_USER];
    } else if (updateData.type === updateTypes.UPDATE_THREAD) {
      types = [
        updateTypes.UPDATE_THREAD,
        updateTypes.UPDATE_THREAD_READ_STATUS,
      ];
    } else if (updateData.type === updateTypes.UPDATE_THREAD_READ_STATUS) {
      types = [updateTypes.UPDATE_THREAD_READ_STATUS];
    } else if (
      updateData.type === updateTypes.DELETE_THREAD ||
      updateData.type === updateTypes.JOIN_THREAD
    ) {
      types = [];
    } else if (updateData.type === updateTypes.UPDATE_ENTRY) {
      types = [];
    } else if (updateData.type === updateTypes.UPDATE_CURRENT_USER) {
      types = [updateTypes.UPDATE_CURRENT_USER];
    } else if (updateData.type === updateTypes.UPDATE_USER) {
      types = [updateTypes.UPDATE_USER];
    } else {
      filteredUpdateDatas.push(updateData);
      continue;
    }
    const conditionKey = conditionKeyForUpdateData(updateData);
    invariant(conditionKey && types, 'should be set');

    // Possibly filter any UpdateDatas in the current batch based on this one
    let keyUpdateDatas = keyedUpdateDatas.get(conditionKey);
    let keyUpdateDatasChanged = false;
    if (!keyUpdateDatas) {
      keyUpdateDatas = [];
    } else if (types.length === 0) {
      keyUpdateDatas = [];
      keyUpdateDatasChanged = true;
    } else {
      const filteredKeyUpdateDatas = keyUpdateDatas.filter(
        keyUpdateData => types.indexOf(keyUpdateData.type) === -1,
      );
      if (filteredKeyUpdateDatas.length === 0) {
        keyUpdateDatas = [];
        keyUpdateDatasChanged = true;
      } else if (filteredKeyUpdateDatas.length !== keyUpdateDatas.length) {
        keyUpdateDatas = filteredKeyUpdateDatas;
        keyUpdateDatasChanged = true;
      }
    }

    // Update the deleteConditions and add our UpdateData to keyedUpdateDatas
    const existingTypes = deleteConditions.get(conditionKey);
    if (types.length === 0) {
      // If this UpdateData says to delete all the others, then include it, and
      // update the deleteConditions (if they don't already say to delete)
      if (!existingTypes || existingTypes.length !== 0) {
        deleteConditions.set(conditionKey, emptyArray);
      }
      keyUpdateDatas.push(updateData);
      keyUpdateDatasChanged = true;
    } else if (!existingTypes) {
      // If there were no existing conditions, then set the deleteConditions and
      // include this UpdateData
      deleteConditions.set(conditionKey, types);
      keyUpdateDatas.push(updateData);
      keyUpdateDatasChanged = true;
    } else {
      // Finally, if we have a list of types to delete, both existing and new,
      // then merge the list for the deleteConditions, and include this
      // UpdateData as long as its list of types isn't a strict subset of the
      // existing one.
      const newTypes = _uniq([...existingTypes, ...types]);
      deleteConditions.set(conditionKey, newTypes);
      const intersection = _intersection(existingTypes)(types);
      if (
        intersection.length !== types.length ||
        intersection.length === existingTypes.length
      ) {
        keyUpdateDatas.push(updateData);
        keyUpdateDatasChanged = true;
      }
    }

    if (!keyUpdateDatasChanged) {
      continue;
    }
    if (keyUpdateDatas.length === 0) {
      keyedUpdateDatas.delete(conditionKey);
    } else {
      keyedUpdateDatas.set(conditionKey, keyUpdateDatas);
    }
  }

  for (let [, singleUpdateDatas] of keyedUpdateDatas) {
    filteredUpdateDatas.push(...singleUpdateDatas);
  }
  const ids = await createIDs('updates', filteredUpdateDatas.length);

  let updatesForCurrentSession =
    viewerInfo && viewerInfo.updatesForCurrentSession;
  if (!updatesForCurrentSession && viewerInfo) {
    updatesForCurrentSession = viewerInfo.viewer.isSocket
      ? 'broadcast'
      : 'return';
  } else if (!updatesForCurrentSession) {
    updatesForCurrentSession = 'broadcast';
  }
  const dontBroadcastSession =
    updatesForCurrentSession !== 'broadcast' && viewerInfo
      ? viewerInfo.viewer.session
      : null;

  const publishInfos: Map<string, PublishInfo> = new Map();
  const viewerRawUpdateInfos: RawUpdateInfo[] = [];
  const insertRows: (?(number | string))[][] = [];
  const earliestTime: Map<string, number> = new Map();
  for (let i = 0; i < filteredUpdateDatas.length; i++) {
    const updateData = filteredUpdateDatas[i];
    let content,
      target = null;
    if (updateData.type === updateTypes.DELETE_ACCOUNT) {
      content = JSON.stringify({ deletedUserID: updateData.deletedUserID });
    } else if (updateData.type === updateTypes.UPDATE_THREAD) {
      content = JSON.stringify({ threadID: updateData.threadID });
    } else if (updateData.type === updateTypes.UPDATE_THREAD_READ_STATUS) {
      const { threadID, unread } = updateData;
      content = JSON.stringify({ threadID, unread });
    } else if (
      updateData.type === updateTypes.DELETE_THREAD ||
      updateData.type === updateTypes.JOIN_THREAD
    ) {
      const { threadID } = updateData;
      content = JSON.stringify({ threadID });
    } else if (updateData.type === updateTypes.BAD_DEVICE_TOKEN) {
      const { deviceToken, targetCookie } = updateData;
      content = JSON.stringify({ deviceToken });
      target = targetCookie;
    } else if (updateData.type === updateTypes.UPDATE_ENTRY) {
      const { entryID, targetSession } = updateData;
      content = JSON.stringify({ entryID });
      target = targetSession;
    } else if (updateData.type === updateTypes.UPDATE_CURRENT_USER) {
      // user column contains all the info we need to construct the UpdateInfo
      content = null;
    } else if (updateData.type === updateTypes.UPDATE_USER) {
      const { updatedUserID } = updateData;
      content = JSON.stringify({ updatedUserID });
    } else {
      invariant(false, `unrecognized updateType ${updateData.type}`);
    }

    const rawUpdateInfo = rawUpdateInfoFromUpdateData(updateData, ids[i]);

    if (!target || !dontBroadcastSession || target !== dontBroadcastSession) {
      const updateTarget = target
        ? { userID: updateData.userID, sessionID: target }
        : { userID: updateData.userID };
      const channelName = channelNameForUpdateTarget(updateTarget);
      let publishInfo = publishInfos.get(channelName);
      if (!publishInfo) {
        publishInfo = { updateTarget, rawUpdateInfos: [] };
        publishInfos.set(channelName, publishInfo);
      }
      publishInfo.rawUpdateInfos.push(rawUpdateInfo);
    }

    if (
      updatesForCurrentSession === 'return' &&
      viewerInfo &&
      updateData.userID === viewerInfo.viewer.id &&
      (!target || target === viewerInfo.viewer.session)
    ) {
      viewerRawUpdateInfos.push(rawUpdateInfo);
    }

    if (viewerInfo && target && viewerInfo.viewer.session === target) {
      // In the case where this update is being created only for the current
      // session, there's no reason to insert a row into the updates table
      continue;
    }

    const key = keyForUpdateData(updateData);
    if (key) {
      const conditionKey = conditionKeyForUpdateDataFromKey(updateData, key);
      const currentEarliestTime = earliestTime.get(conditionKey);
      if (!currentEarliestTime || updateData.time < currentEarliestTime) {
        earliestTime.set(conditionKey, updateData.time);
      }
    }

    const insertRow = [
      ids[i],
      updateData.userID,
      updateData.type,
      key,
      content,
      updateData.time,
      dontBroadcastSession,
      target,
    ];
    insertRows.push(insertRow);
  }

  const deleteSQLConditions: SQLStatement[] = [...deleteConditions].map(
    ([conditionKey: string, types: number[]]) => {
      const [userID, key, target] = conditionKey.split('|');
      const conditions = [SQL`u.user = ${userID}`, SQL`u.key = ${key}`];
      if (target) {
        conditions.push(SQL`u.target = ${target}`);
      }
      if (types.length > 0) {
        conditions.push(SQL`u.type IN (${types})`);
      }
      const earliestTimeForCondition = earliestTime.get(conditionKey);
      if (earliestTimeForCondition) {
        conditions.push(SQL`u.time < ${earliestTimeForCondition}`);
      }
      return mergeAndConditions(conditions);
    },
  );

  const promises = {};

  if (insertRows.length > 0) {
    const insertQuery = SQL`
      INSERT INTO updates(id, user, type, \`key\`,
        content, time, updater, target)
    `;
    insertQuery.append(SQL`VALUES ${insertRows}`);
    promises.insert = dbQuery(insertQuery);
  }

  if (publishInfos.size > 0) {
    handleAsyncPromise(
      redisPublish(publishInfos.values(), dontBroadcastSession),
    );
  }

  if (deleteSQLConditions.length > 0) {
    promises.delete = deleteUpdatesByConditions(deleteSQLConditions);
  }

  if (viewerRawUpdateInfos.length > 0) {
    invariant(viewerInfo, 'should be set');
    promises.updatesResult = fetchUpdateInfosWithRawUpdateInfos(
      viewerRawUpdateInfos,
      viewerInfo,
    );
  }

  const { updatesResult } = await promiseAll(promises);
  if (!updatesResult) {
    return defaultUpdateCreationResult;
  }
  const { updateInfos, userInfos } = updatesResult;
  return { viewerUpdates: updateInfos, userInfos };
}

export type FetchUpdatesResult = {|
  updateInfos: $ReadOnlyArray<UpdateInfo>,
  userInfos: { [id: string]: AccountUserInfo },
|};
async function fetchUpdateInfosWithRawUpdateInfos(
  rawUpdateInfos: $ReadOnlyArray<RawUpdateInfo>,
  viewerInfo: ViewerInfo,
): Promise<FetchUpdatesResult> {
  const { viewer } = viewerInfo;

  const threadIDsNeedingFetch = new Set();
  const entryIDsNeedingFetch = new Set();
  const currentUserIDsNeedingFetch = new Set();
  const threadIDsNeedingDetailedFetch = new Set(); // entries and messages
  for (let rawUpdateInfo of rawUpdateInfos) {
    if (
      !viewerInfo.threadInfos &&
      (rawUpdateInfo.type === updateTypes.UPDATE_THREAD ||
        rawUpdateInfo.type === updateTypes.JOIN_THREAD)
    ) {
      threadIDsNeedingFetch.add(rawUpdateInfo.threadID);
    }
    if (rawUpdateInfo.type === updateTypes.JOIN_THREAD) {
      threadIDsNeedingDetailedFetch.add(rawUpdateInfo.threadID);
    } else if (rawUpdateInfo.type === updateTypes.UPDATE_ENTRY) {
      entryIDsNeedingFetch.add(rawUpdateInfo.entryID);
    } else if (rawUpdateInfo.type === updateTypes.UPDATE_CURRENT_USER) {
      currentUserIDsNeedingFetch.add(viewer.userID);
    }
  }

  const promises = {};

  if (!viewerInfo.threadInfos && threadIDsNeedingFetch.size > 0) {
    promises.threadResult = fetchThreadInfos(
      viewer,
      SQL`t.id IN (${[...threadIDsNeedingFetch]})`,
    );
  }

  let calendarQuery: ?CalendarQuery = viewerInfo.calendarQuery
    ? viewerInfo.calendarQuery
    : null;
  if (!calendarQuery && viewer.hasSessionInfo) {
    // This should only ever happen for "legacy" clients who call in without
    // providing this information. These clients wouldn't know how to deal with
    // the corresponding UpdateInfos anyways, so no reason to be worried.
    calendarQuery = viewer.calendarQuery;
  } else if (!calendarQuery) {
    calendarQuery = defaultCalendarQuery(viewer.platform, viewer.timeZone);
  }
  if (threadIDsNeedingDetailedFetch.size > 0) {
    const threadSelectionCriteria = { threadCursors: {} };
    for (let threadID of threadIDsNeedingDetailedFetch) {
      threadSelectionCriteria.threadCursors[threadID] = false;
    }
    promises.messageInfosResult = fetchMessageInfos(
      viewer,
      threadSelectionCriteria,
      defaultNumberPerThread,
    );
    const threadCalendarQuery = {
      ...calendarQuery,
      filters: [
        ...nonThreadCalendarFilters(calendarQuery.filters),
        { type: 'threads', threadIDs: [...threadIDsNeedingDetailedFetch] },
      ],
    };
    promises.calendarResult = fetchEntryInfos(viewer, [threadCalendarQuery]);
  }

  if (entryIDsNeedingFetch.size > 0) {
    promises.entryInfosResult = fetchEntryInfosByID(viewer, [
      ...entryIDsNeedingFetch,
    ]);
  }

  if (currentUserIDsNeedingFetch.size > 0) {
    promises.currentUserInfosResult = fetchLoggedInUserInfos([
      ...currentUserIDsNeedingFetch,
    ]);
  }

  const {
    threadResult,
    messageInfosResult,
    calendarResult,
    entryInfosResult,
    currentUserInfosResult,
  } = await promiseAll(promises);

  let threadInfosResult;
  if (viewerInfo.threadInfos) {
    const { threadInfos, userInfos } = viewerInfo;
    threadInfosResult = { threadInfos, userInfos };
  } else if (threadResult) {
    threadInfosResult = threadResult;
  } else {
    threadInfosResult = { threadInfos: {}, userInfos: {} };
  }

  return await updateInfosFromRawUpdateInfos(viewer, rawUpdateInfos, {
    threadInfosResult,
    messageInfosResult,
    calendarResult,
    entryInfosResult,
    currentUserInfosResult,
  });
}

export type UpdateInfosRawData = {|
  threadInfosResult: FetchThreadInfosResult,
  messageInfosResult: ?FetchMessageInfosResult,
  calendarResult: ?FetchEntryInfosResponse,
  entryInfosResult: ?$ReadOnlyArray<RawEntryInfo>,
  currentUserInfosResult: ?$ReadOnlyArray<LoggedInUserInfo>,
|};
async function updateInfosFromRawUpdateInfos(
  viewer: Viewer,
  rawUpdateInfos: $ReadOnlyArray<RawUpdateInfo>,
  rawData: UpdateInfosRawData,
): Promise<FetchUpdatesResult> {
  const {
    threadInfosResult,
    messageInfosResult,
    calendarResult,
    entryInfosResult,
    currentUserInfosResult,
  } = rawData;
  const updateInfos = [];
  const userIDsToFetch = new Set();
  for (let rawUpdateInfo of rawUpdateInfos) {
    if (rawUpdateInfo.type === updateTypes.DELETE_ACCOUNT) {
      updateInfos.push({
        type: updateTypes.DELETE_ACCOUNT,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        deletedUserID: rawUpdateInfo.deletedUserID,
      });
    } else if (rawUpdateInfo.type === updateTypes.UPDATE_THREAD) {
      const threadInfo = threadInfosResult.threadInfos[rawUpdateInfo.threadID];
      invariant(threadInfo, 'should be set');
      updateInfos.push({
        type: updateTypes.UPDATE_THREAD,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        threadInfo,
      });
    } else if (rawUpdateInfo.type === updateTypes.UPDATE_THREAD_READ_STATUS) {
      updateInfos.push({
        type: updateTypes.UPDATE_THREAD_READ_STATUS,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        threadID: rawUpdateInfo.threadID,
        unread: rawUpdateInfo.unread,
      });
    } else if (rawUpdateInfo.type === updateTypes.DELETE_THREAD) {
      updateInfos.push({
        type: updateTypes.DELETE_THREAD,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        threadID: rawUpdateInfo.threadID,
      });
    } else if (rawUpdateInfo.type === updateTypes.JOIN_THREAD) {
      const threadInfo = threadInfosResult.threadInfos[rawUpdateInfo.threadID];
      invariant(threadInfo, 'should be set');
      const rawEntryInfos = [];
      invariant(calendarResult, 'should be set');
      for (let entryInfo of calendarResult.rawEntryInfos) {
        if (entryInfo.threadID === rawUpdateInfo.threadID) {
          rawEntryInfos.push(entryInfo);
        }
      }
      const rawMessageInfos = [];
      invariant(messageInfosResult, 'should be set');
      for (let messageInfo of messageInfosResult.rawMessageInfos) {
        if (messageInfo.threadID === rawUpdateInfo.threadID) {
          rawMessageInfos.push(messageInfo);
        }
      }
      updateInfos.push({
        type: updateTypes.JOIN_THREAD,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        threadInfo,
        rawMessageInfos,
        truncationStatus:
          messageInfosResult.truncationStatuses[rawUpdateInfo.threadID],
        rawEntryInfos,
      });
    } else if (rawUpdateInfo.type === updateTypes.BAD_DEVICE_TOKEN) {
      updateInfos.push({
        type: updateTypes.BAD_DEVICE_TOKEN,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        deviceToken: rawUpdateInfo.deviceToken,
      });
    } else if (rawUpdateInfo.type === updateTypes.UPDATE_ENTRY) {
      invariant(entryInfosResult, 'should be set');
      const entryInfo = entryInfosResult.find(
        candidate => candidate.id === rawUpdateInfo.entryID,
      );
      invariant(entryInfo, 'should be set');
      updateInfos.push({
        type: updateTypes.UPDATE_ENTRY,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        entryInfo,
      });
    } else if (rawUpdateInfo.type === updateTypes.UPDATE_CURRENT_USER) {
      invariant(currentUserInfosResult, 'should be set');
      const currentUserInfo = currentUserInfosResult.find(
        candidate => candidate.id === viewer.userID,
      );
      invariant(currentUserInfo, 'should be set');
      updateInfos.push({
        type: updateTypes.UPDATE_CURRENT_USER,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        currentUserInfo,
      });
    } else if (rawUpdateInfo.type === updateTypes.UPDATE_USER) {
      updateInfos.push({
        type: updateTypes.UPDATE_USER,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        updatedUserID: rawUpdateInfo.updatedUserID,
      });
      userIDsToFetch.add(rawUpdateInfo.updatedUserID);
    } else {
      invariant(false, `unrecognized updateType ${rawUpdateInfo.type}`);
    }
  }

  let userInfos = {};
  if (userIDsToFetch.size > 0) {
    userInfos = await fetchKnownUserInfos(viewer, [...userIDsToFetch]);
  }

  updateInfos.sort(sortFunction);

  // Now we'll attempt to merge UpdateInfos so that we only have one per key
  const updateForKey: Map<string, UpdateInfo> = new Map();
  const mergedUpdates: UpdateInfo[] = [];
  for (let updateInfo of updateInfos) {
    const key = keyForUpdateInfo(updateInfo);
    if (!key) {
      mergedUpdates.push(updateInfo);
      continue;
    } else if (
      updateInfo.type === updateTypes.DELETE_THREAD ||
      updateInfo.type === updateTypes.JOIN_THREAD ||
      updateInfo.type === updateTypes.DELETE_ACCOUNT
    ) {
      updateForKey.set(key, updateInfo);
      continue;
    }
    const currentUpdateInfo = updateForKey.get(key);
    if (!currentUpdateInfo) {
      updateForKey.set(key, updateInfo);
    } else if (
      updateInfo.type === updateTypes.UPDATE_THREAD &&
      currentUpdateInfo.type === updateTypes.UPDATE_THREAD_READ_STATUS
    ) {
      // UPDATE_THREAD trumps UPDATE_THREAD_READ_STATUS
      // Note that we keep the oldest UPDATE_THREAD
      updateForKey.set(key, updateInfo);
    } else if (
      updateInfo.type === updateTypes.UPDATE_THREAD_READ_STATUS &&
      currentUpdateInfo.type === updateTypes.UPDATE_THREAD_READ_STATUS
    ) {
      // If we only have UPDATE_THREAD_READ_STATUS, keep the most recent
      updateForKey.set(key, updateInfo);
    } else if (updateInfo.type === updateTypes.UPDATE_ENTRY) {
      updateForKey.set(key, updateInfo);
    } else if (updateInfo.type === updateTypes.UPDATE_CURRENT_USER) {
      updateForKey.set(key, updateInfo);
    }
  }
  for (let [, updateInfo] of updateForKey) {
    mergedUpdates.push(updateInfo);
  }
  mergedUpdates.sort(sortFunction);

  return { updateInfos: mergedUpdates, userInfos };
}

type PublishInfo = {|
  updateTarget: UpdateTarget,
  rawUpdateInfos: RawUpdateInfo[],
|};
async function redisPublish(
  publishInfos: Iterator<PublishInfo>,
  dontBroadcastSession: ?string,
): Promise<void> {
  for (let publishInfo of publishInfos) {
    const { updateTarget, rawUpdateInfos } = publishInfo;
    const redisMessage: NewUpdatesRedisMessage = {
      type: redisMessageTypes.NEW_UPDATES,
      updates: rawUpdateInfos,
    };
    if (!updateTarget.sessionID && dontBroadcastSession) {
      redisMessage.ignoreSession = dontBroadcastSession;
    }
    publisher.sendMessage(updateTarget, redisMessage);
  }
}

export { createUpdates, fetchUpdateInfosWithRawUpdateInfos };
