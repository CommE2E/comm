// @flow

import invariant from 'invariant';

import { nonThreadCalendarFilters } from 'lib/selectors/calendar-filter-selectors.js';
import {
  keyForUpdateData,
  keyForUpdateInfo,
  rawUpdateInfoFromUpdateData,
} from 'lib/shared/update-utils.js';
import {
  type RawEntryInfo,
  type FetchEntryInfosBase,
  type CalendarQuery,
  defaultCalendarQuery,
} from 'lib/types/entry-types.js';
import {
  defaultNumberPerThread,
  type FetchMessageInfosResult,
} from 'lib/types/message-types.js';
import {
  type UpdateTarget,
  redisMessageTypes,
  type NewUpdatesRedisMessage,
} from 'lib/types/redis-types.js';
import type { RawThreadInfo } from 'lib/types/thread-types.js';
import {
  type ServerUpdateInfo,
  type UpdateData,
  type RawUpdateInfo,
  type CreateUpdatesResult,
  updateTypes,
} from 'lib/types/update-types.js';
import type {
  UserInfos,
  LoggedInUserInfo,
  OldLoggedInUserInfo,
} from 'lib/types/user-types.js';
import { promiseAll } from 'lib/utils/promises.js';

import createIDs from './id-creator.js';
import { dbQuery, SQL, mergeAndConditions } from '../database/database.js';
import type { SQLStatementType } from '../database/types.js';
import { deleteUpdatesByConditions } from '../deleters/update-deleters.js';
import {
  fetchEntryInfos,
  fetchEntryInfosByID,
} from '../fetchers/entry-fetchers.js';
import { fetchMessageInfos } from '../fetchers/message-fetchers.js';
import {
  fetchThreadInfos,
  type FetchThreadInfosResult,
} from '../fetchers/thread-fetchers.js';
import {
  fetchKnownUserInfos,
  fetchCurrentUserInfo,
} from '../fetchers/user-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import { channelNameForUpdateTarget, publisher } from '../socket/redis.js';

export type UpdatesForCurrentSession =
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

type DeleteCondition = {
  +userID: string,
  +target: ?string,
  +types: 'all_types' | $ReadOnlySet<number>,
};

export type ViewerInfo =
  | {
      viewer: Viewer,
      calendarQuery?: ?CalendarQuery,
      updatesForCurrentSession?: UpdatesForCurrentSession,
    }
  | {
      viewer: Viewer,
      calendarQuery: ?CalendarQuery,
      updatesForCurrentSession?: UpdatesForCurrentSession,
      threadInfos: { +[id: string]: RawThreadInfo },
    };
const defaultUpdateCreationResult = { viewerUpdates: [], userInfos: {} };
const sortFunction = (
  a: UpdateData | ServerUpdateInfo,
  b: UpdateData | ServerUpdateInfo,
) => a.time - b.time;
const deleteUpdatesBatchSize = 500;

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
  for (const updateData of sortedUpdateDatas) {
    const key = keyForUpdateData(updateData);
    if (!key) {
      filteredUpdateDatas.push(updateData);
      continue;
    }
    const conditionKey = `${updateData.userID}|${key}`;

    const deleteCondition = getDeleteCondition(updateData);
    invariant(
      deleteCondition,
      `updateData of type ${updateData.type} has conditionKey ` +
        `${conditionKey} but no deleteCondition`,
    );

    const curUpdateDatas = keyedUpdateDatas.get(conditionKey);
    if (!curUpdateDatas) {
      keyedUpdateDatas.set(conditionKey, [updateData]);
      continue;
    }

    const filteredCurrent = curUpdateDatas.filter(curUpdateData =>
      filterOnDeleteCondition(curUpdateData, deleteCondition),
    );
    if (filteredCurrent.length === 0) {
      keyedUpdateDatas.set(conditionKey, [updateData]);
      continue;
    }

    const isNewUpdateDataFiltered = !filteredCurrent.every(curUpdateData => {
      const curDeleteCondition = getDeleteCondition(curUpdateData);
      invariant(
        curDeleteCondition,
        `updateData of type ${curUpdateData.type} is in keyedUpdateDatas ` +
          "but doesn't have a deleteCondition",
      );
      return filterOnDeleteCondition(updateData, curDeleteCondition);
    });
    if (!isNewUpdateDataFiltered) {
      filteredCurrent.push(updateData);
    }
    keyedUpdateDatas.set(conditionKey, filteredCurrent);
  }

  for (const keyUpdateDatas of keyedUpdateDatas.values()) {
    filteredUpdateDatas.push(...keyUpdateDatas);
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
    let content;
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
      const { deviceToken } = updateData;
      content = JSON.stringify({ deviceToken });
    } else if (updateData.type === updateTypes.UPDATE_ENTRY) {
      const { entryID } = updateData;
      content = JSON.stringify({ entryID });
    } else if (updateData.type === updateTypes.UPDATE_CURRENT_USER) {
      // user column contains all the info we need to construct the UpdateInfo
      content = null;
    } else if (updateData.type === updateTypes.UPDATE_USER) {
      const { updatedUserID } = updateData;
      content = JSON.stringify({ updatedUserID });
    } else {
      invariant(false, `unrecognized updateType ${updateData.type}`);
    }

    const target = getTargetFromUpdateData(updateData);
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
      const conditionKey = `${updateData.userID}|${key}`;
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

  type DeleteUpdatesConditions = {
    key: string,
    target?: string,
    types?: number[],
    time?: number,
  };
  const usersByConditions: Map<
    string,
    {
      conditions: DeleteUpdatesConditions,
      users: Set<string>,
    },
  > = new Map();
  for (const [conditionKey, keyUpdateDatas] of keyedUpdateDatas) {
    const deleteConditionByTarget: Map<?string, DeleteCondition> = new Map();
    for (const updateData of keyUpdateDatas) {
      const deleteCondition = getDeleteCondition(updateData);
      invariant(
        deleteCondition,
        `updateData of type ${updateData.type} is in keyedUpdateDatas but ` +
          "doesn't have a deleteCondition",
      );
      const { target, types } = deleteCondition;

      const existingDeleteCondition = deleteConditionByTarget.get(target);
      if (!existingDeleteCondition) {
        deleteConditionByTarget.set(target, deleteCondition);
        continue;
      }

      const existingTypes = existingDeleteCondition.types;
      if (existingTypes === 'all_types') {
        continue;
      } else if (types === 'all_types') {
        deleteConditionByTarget.set(target, deleteCondition);
        continue;
      }

      const mergedTypes = new Set([...types, ...existingTypes]);
      deleteConditionByTarget.set(target, {
        ...deleteCondition,
        types: mergedTypes,
      });
    }

    for (const deleteCondition of deleteConditionByTarget.values()) {
      const { userID, target, types } = deleteCondition;
      const key = conditionKey.split('|')[1];
      const conditions: DeleteUpdatesConditions = { key };
      if (target) {
        conditions.target = target;
      }
      if (types !== 'all_types') {
        invariant(types.size > 0, 'deleteCondition had empty types set');
        conditions.types = [...types];
      }
      const earliestTimeForCondition = earliestTime.get(conditionKey);
      if (earliestTimeForCondition) {
        conditions.time = earliestTimeForCondition;
      }

      const conditionsKey = JSON.stringify(conditions);
      if (!usersByConditions.has(conditionsKey)) {
        usersByConditions.set(conditionsKey, {
          conditions,
          users: new Set(),
        });
      }
      usersByConditions.get(conditionsKey)?.users.add(userID);
    }
  }

  const deleteSQLConditions: SQLStatementType[] = [];
  for (const { conditions, users } of usersByConditions.values()) {
    const sqlConditions = [
      SQL`u.user IN (${[...users]})`,
      SQL`u.key = ${conditions.key}`,
    ];
    if (conditions.target) {
      sqlConditions.push(SQL`u.target = ${conditions.target}`);
    }
    if (conditions.types) {
      sqlConditions.push(SQL`u.type IN (${conditions.types})`);
    }
    if (conditions.time) {
      sqlConditions.push(SQL`u.time < ${conditions.time}`);
    }
    deleteSQLConditions.push(mergeAndConditions(sqlConditions));
  }

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
    promises.messageBroker = messageBrokerPublish(
      publishInfos.values(),
      dontBroadcastSession,
    );
  }

  if (deleteSQLConditions.length > 0) {
    promises.delete = (async () => {
      while (deleteSQLConditions.length > 0) {
        const batch = deleteSQLConditions.splice(0, deleteUpdatesBatchSize);
        await deleteUpdatesByConditions(batch);
      }
    })();
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

export type FetchUpdatesResult = {
  +updateInfos: $ReadOnlyArray<ServerUpdateInfo>,
  +userInfos: UserInfos,
};
async function fetchUpdateInfosWithRawUpdateInfos(
  rawUpdateInfos: $ReadOnlyArray<RawUpdateInfo>,
  viewerInfo: ViewerInfo,
): Promise<FetchUpdatesResult> {
  const { viewer } = viewerInfo;

  const threadIDsNeedingFetch = new Set();
  const entryIDsNeedingFetch = new Set();
  let currentUserNeedsFetch = false;
  const threadIDsNeedingDetailedFetch = new Set(); // entries and messages
  for (const rawUpdateInfo of rawUpdateInfos) {
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
      currentUserNeedsFetch = true;
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
    const messageSelectionCriteria = { threadCursors: {} };
    for (const threadID of threadIDsNeedingDetailedFetch) {
      messageSelectionCriteria.threadCursors[threadID] = false;
    }
    promises.messageInfosResult = fetchMessageInfos(
      viewer,
      messageSelectionCriteria,
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

  if (currentUserNeedsFetch) {
    promises.currentUserInfoResult = (async () => {
      const currentUserInfo = await fetchCurrentUserInfo(viewer);
      invariant(currentUserInfo.anonymous === undefined, 'should be logged in');
      return currentUserInfo;
    })();
  }

  const {
    threadResult,
    messageInfosResult,
    calendarResult,
    entryInfosResult,
    currentUserInfoResult,
  } = await promiseAll(promises);

  let threadInfosResult;
  if (viewerInfo.threadInfos) {
    const { threadInfos } = viewerInfo;
    threadInfosResult = { threadInfos };
  } else if (threadResult) {
    threadInfosResult = threadResult;
  } else {
    threadInfosResult = { threadInfos: {} };
  }

  return await updateInfosFromRawUpdateInfos(viewer, rawUpdateInfos, {
    threadInfosResult,
    messageInfosResult,
    calendarResult,
    entryInfosResult,
    currentUserInfoResult,
  });
}

export type UpdateInfosRawData = {
  threadInfosResult: FetchThreadInfosResult,
  messageInfosResult: ?FetchMessageInfosResult,
  calendarResult: ?FetchEntryInfosBase,
  entryInfosResult: ?$ReadOnlyArray<RawEntryInfo>,
  currentUserInfoResult: ?OldLoggedInUserInfo | LoggedInUserInfo,
};
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
    currentUserInfoResult,
  } = rawData;
  const updateInfos = [];
  const userIDsToFetch = new Set();
  for (const rawUpdateInfo of rawUpdateInfos) {
    if (rawUpdateInfo.type === updateTypes.DELETE_ACCOUNT) {
      updateInfos.push({
        type: updateTypes.DELETE_ACCOUNT,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        deletedUserID: rawUpdateInfo.deletedUserID,
      });
    } else if (rawUpdateInfo.type === updateTypes.UPDATE_THREAD) {
      const threadInfo = threadInfosResult.threadInfos[rawUpdateInfo.threadID];
      if (!threadInfo) {
        console.warn(
          "failed to hydrate updateTypes.UPDATE_THREAD because we couldn't " +
            `fetch RawThreadInfo for ${rawUpdateInfo.threadID}`,
        );
        continue;
      }
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
      if (!threadInfo) {
        console.warn(
          "failed to hydrate updateTypes.JOIN_THREAD because we couldn't " +
            `fetch RawThreadInfo for ${rawUpdateInfo.threadID}`,
        );
        continue;
      }
      const rawEntryInfos = [];
      invariant(calendarResult, 'should be set');
      for (const entryInfo of calendarResult.rawEntryInfos) {
        if (entryInfo.threadID === rawUpdateInfo.threadID) {
          rawEntryInfos.push(entryInfo);
        }
      }
      const rawMessageInfos = [];
      invariant(messageInfosResult, 'should be set');
      for (const messageInfo of messageInfosResult.rawMessageInfos) {
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
      if (!entryInfo) {
        console.warn(
          "failed to hydrate updateTypes.UPDATE_ENTRY because we couldn't " +
            `fetch RawEntryInfo for ${rawUpdateInfo.entryID}`,
        );
        continue;
      }
      updateInfos.push({
        type: updateTypes.UPDATE_ENTRY,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        entryInfo,
      });
    } else if (rawUpdateInfo.type === updateTypes.UPDATE_CURRENT_USER) {
      invariant(currentUserInfoResult, 'should be set');
      updateInfos.push({
        type: updateTypes.UPDATE_CURRENT_USER,
        id: rawUpdateInfo.id,
        time: rawUpdateInfo.time,
        currentUserInfo: currentUserInfoResult,
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
  const updateForKey: Map<string, ServerUpdateInfo> = new Map();
  const mergedUpdates: ServerUpdateInfo[] = [];
  for (const updateInfo of updateInfos) {
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
  for (const [, updateInfo] of updateForKey) {
    mergedUpdates.push(updateInfo);
  }
  mergedUpdates.sort(sortFunction);

  return { updateInfos: mergedUpdates, userInfos };
}

type PublishInfo = {
  updateTarget: UpdateTarget,
  rawUpdateInfos: RawUpdateInfo[],
};
async function messageBrokerPublish(
  publishInfos: Iterator<PublishInfo>,
  dontBroadcastSession: ?string,
): Promise<void> {
  for (const publishInfo of publishInfos) {
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

function getTargetFromUpdateData(updateData: UpdateData): ?string {
  if (updateData.targetSession) {
    return updateData.targetSession;
  } else if (updateData.targetCookie) {
    return updateData.targetCookie;
  } else {
    return null;
  }
}

function getDeleteCondition(updateData: UpdateData): ?DeleteCondition {
  let types;
  if (updateData.type === updateTypes.DELETE_ACCOUNT) {
    types = new Set([updateTypes.DELETE_ACCOUNT, updateTypes.UPDATE_USER]);
  } else if (updateData.type === updateTypes.UPDATE_THREAD) {
    types = new Set([
      updateTypes.UPDATE_THREAD,
      updateTypes.UPDATE_THREAD_READ_STATUS,
    ]);
  } else if (updateData.type === updateTypes.UPDATE_THREAD_READ_STATUS) {
    types = new Set([updateTypes.UPDATE_THREAD_READ_STATUS]);
  } else if (
    updateData.type === updateTypes.DELETE_THREAD ||
    updateData.type === updateTypes.JOIN_THREAD
  ) {
    types = 'all_types';
  } else if (updateData.type === updateTypes.UPDATE_ENTRY) {
    types = 'all_types';
  } else if (updateData.type === updateTypes.UPDATE_CURRENT_USER) {
    types = new Set([updateTypes.UPDATE_CURRENT_USER]);
  } else if (updateData.type === updateTypes.UPDATE_USER) {
    types = new Set([updateTypes.UPDATE_USER]);
  } else {
    return null;
  }

  const target = getTargetFromUpdateData(updateData);
  const { userID } = updateData;
  return { userID, target, types };
}

function filterOnDeleteCondition(
  updateData: UpdateData,
  deleteCondition: DeleteCondition,
): boolean {
  invariant(
    updateData.userID === deleteCondition.userID,
    `updateData of type ${updateData.type} being compared to wrong userID`,
  );
  if (deleteCondition.target) {
    const target = getTargetFromUpdateData(updateData);
    if (target !== deleteCondition.target) {
      return true;
    }
  }
  if (deleteCondition.types === 'all_types') {
    return false;
  }
  return !deleteCondition.types.has(updateData.type);
}

export { createUpdates, fetchUpdateInfosWithRawUpdateInfos };
