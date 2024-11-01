// @flow

import invariant from 'invariant';

import { nonThreadCalendarFilters } from 'lib/selectors/calendar-filter-selectors.js';
import {
  keyForUpdateData,
  keyForUpdateInfo,
  rawUpdateInfoFromUpdateData,
} from 'lib/shared/update-utils.js';
import type {
  UpdateInfosRawData,
  UpdateTypes,
} from 'lib/shared/updates/update-spec.js';
import { updateSpecs } from 'lib/shared/updates/update-specs.js';
import {
  type CalendarQuery,
  defaultCalendarQuery,
  type RawEntryInfos,
  type RawEntryInfo,
  type FetchEntryInfosBase,
} from 'lib/types/entry-types.js';
import {
  defaultNumberPerThread,
  type MessageSelectionCriteria,
  type FetchMessageInfosResult,
  type RawMessageInfo,
} from 'lib/types/message-types.js';
import {
  type UpdateTarget,
  redisMessageTypes,
  type NewUpdatesRedisMessage,
} from 'lib/types/redis-types.js';
import type { MixedRawThreadInfos } from 'lib/types/thread-types';
import {
  type ServerUpdateInfo,
  type UpdateData,
  type RawUpdateInfo,
  type CreateUpdatesResult,
} from 'lib/types/update-types.js';
import type { UserInfos, LoggedInUserInfo } from 'lib/types/user-types.js';
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
  fetchAccessibleThreadInfos,
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
  +types: UpdateTypes,
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
      threadInfos: MixedRawThreadInfos,
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

    const content =
      updateSpecs[updateData.type].updateContentForServerDB(updateData);

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

  const insertPromise = (async () => {
    if (insertRows.length === 0) {
      return;
    }
    const insertQuery = SQL`
      INSERT INTO updates(id, user, type, \`key\`,
        content, time, updater, target)
    `;
    insertQuery.append(SQL`VALUES ${insertRows}`);
    await dbQuery(insertQuery);
  })();

  const redisPromise =
    publishInfos.size > 0
      ? redisPublish(publishInfos.values(), dontBroadcastSession)
      : Promise.resolve(undefined);

  const deletePromise = (async () => {
    if (deleteSQLConditions.length === 0) {
      return;
    }
    while (deleteSQLConditions.length > 0) {
      const batch = deleteSQLConditions.splice(0, deleteUpdatesBatchSize);
      await deleteUpdatesByConditions(batch);
    }
  })();

  const updatesPromise: Promise<?FetchUpdatesResult> = (async () => {
    if (viewerRawUpdateInfos.length === 0) {
      return undefined;
    }
    invariant(viewerInfo, 'should be set');
    return await fetchUpdateInfosWithRawUpdateInfos(
      viewerRawUpdateInfos,
      viewerInfo,
    );
  })();

  const { updatesResult } = await promiseAll({
    updatesResult: updatesPromise,
    insertResult: insertPromise,
    redisResult: redisPromise,
    deleteResult: deletePromise,
  });
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
  const entitiesToFetch = rawUpdateInfos
    .map(info => updateSpecs[info.type].entitiesToFetch?.(info))
    .filter(Boolean);
  const currentUserNeedsFetch = entitiesToFetch.some(
    ({ currentUser }) => currentUser,
  );
  const threadIDsNeedingFetch = viewerInfo.threadInfos
    ? new Set<string>()
    : new Set<string>(
        entitiesToFetch.map(({ threadID }) => threadID).filter(Boolean),
      );
  const entryIDsNeedingFetch = new Set(
    entitiesToFetch.map(({ entryID }) => entryID).filter(Boolean),
  );
  // entries and messages
  const threadIDsNeedingDetailedFetch = new Set(
    entitiesToFetch
      .map(({ detailedThreadID }) => detailedThreadID)
      .filter(Boolean),
  );
  const userIDsToFetch = new Set(
    entitiesToFetch.map(({ userID }) => userID).filter(Boolean),
  );

  const { viewer } = viewerInfo;
  const threadPromise: Promise<?FetchThreadInfosResult> = (async () => {
    if (viewerInfo.threadInfos || threadIDsNeedingFetch.size === 0) {
      return undefined;
    }
    return await fetchAccessibleThreadInfos(viewer, {
      threadIDs: threadIDsNeedingFetch,
    });
  })();

  let calendarQueryTmp: ?CalendarQuery = viewerInfo.calendarQuery ?? null;
  if (!calendarQueryTmp && viewer.hasSessionInfo) {
    // This should only ever happen for "legacy" clients who call in without
    // providing this information. These clients wouldn't know how to deal with
    // the corresponding UpdateInfos anyways, so no reason to be worried.
    calendarQueryTmp = viewer.calendarQuery;
  } else if (!calendarQueryTmp) {
    calendarQueryTmp = defaultCalendarQuery(viewer.platform, viewer.timeZone);
  }
  const calendarQuery = calendarQueryTmp;

  const messageInfosPromise: Promise<?FetchMessageInfosResult> = (async () => {
    if (threadIDsNeedingDetailedFetch.size === 0) {
      return undefined;
    }
    const threadCursors: { [string]: ?string } = {};
    for (const threadID of threadIDsNeedingDetailedFetch) {
      threadCursors[threadID] = null;
    }
    const messageSelectionCriteria: MessageSelectionCriteria = {
      threadCursors,
    };
    return await fetchMessageInfos(
      viewer,
      messageSelectionCriteria,
      defaultNumberPerThread,
    );
  })();

  const calendarPromise: Promise<?FetchEntryInfosBase> = (async () => {
    if (threadIDsNeedingDetailedFetch.size === 0) {
      return undefined;
    }
    const threadCalendarQuery = {
      ...calendarQuery,
      filters: [
        ...nonThreadCalendarFilters(calendarQuery.filters),
        { type: 'threads', threadIDs: [...threadIDsNeedingDetailedFetch] },
      ],
    };
    return await fetchEntryInfos(viewer, [threadCalendarQuery]);
  })();

  const entryInfosPromise: Promise<?RawEntryInfos> = (async () => {
    if (entryIDsNeedingFetch.size === 0) {
      return undefined;
    }
    return await fetchEntryInfosByID(viewer, entryIDsNeedingFetch);
  })();

  const currentUserInfoPromise: Promise<?LoggedInUserInfo> = (async () => {
    if (!currentUserNeedsFetch) {
      return undefined;
    }
    const currentUserInfo = await fetchCurrentUserInfo(viewer);
    invariant(currentUserInfo.anonymous === undefined, 'should be logged in');
    return currentUserInfo;
  })();

  const userInfosPromise: Promise<?UserInfos> = (async () => {
    if (userIDsToFetch.size === 0) {
      return undefined;
    }
    return await fetchKnownUserInfos(viewer, [...userIDsToFetch]);
  })();

  const {
    threadResult,
    messageInfosResult,
    calendarResult,
    entryInfosResult,
    currentUserInfoResult,
    userInfosResult,
  } = await promiseAll({
    threadResult: threadPromise,
    messageInfosResult: messageInfosPromise,
    calendarResult: calendarPromise,
    entryInfosResult: entryInfosPromise,
    currentUserInfoResult: currentUserInfoPromise,
    userInfosResult: userInfosPromise,
  });

  let threadInfos = {};
  if (viewerInfo.threadInfos) {
    threadInfos = viewerInfo.threadInfos;
  } else if (threadResult) {
    threadInfos = threadResult.threadInfos;
  }

  return await updateInfosFromRawUpdateInfos(viewer, rawUpdateInfos, {
    threadInfos,
    messageInfosResult,
    calendarResult,
    entryInfosResult,
    currentUserInfoResult,
    userInfosResult,
  });
}

async function updateInfosFromRawUpdateInfos(
  viewer: Viewer,
  rawUpdateInfos: $ReadOnlyArray<RawUpdateInfo>,
  rawData: UpdateInfosRawData,
): Promise<FetchUpdatesResult> {
  const { messageInfosResult, calendarResult, userInfosResult } = rawData;

  const rawEntryInfosByThreadID: { [string]: Array<RawEntryInfo> } = {};
  for (const entryInfo of calendarResult?.rawEntryInfos ?? []) {
    if (!rawEntryInfosByThreadID[entryInfo.threadID]) {
      rawEntryInfosByThreadID[entryInfo.threadID] = [];
    }
    rawEntryInfosByThreadID[entryInfo.threadID].push(entryInfo);
  }

  const rawMessageInfosByThreadID: { [string]: Array<RawMessageInfo> } = {};
  for (const messageInfo of messageInfosResult?.rawMessageInfos ?? []) {
    if (!rawMessageInfosByThreadID[messageInfo.threadID]) {
      rawMessageInfosByThreadID[messageInfo.threadID] = [];
    }
    rawMessageInfosByThreadID[messageInfo.threadID].push(messageInfo);
  }

  const params = {
    data: rawData,
    rawEntryInfosByThreadID,
    rawMessageInfosByThreadID,
  };
  const updateInfos = rawUpdateInfos
    .map(update =>
      updateSpecs[update.type].updateInfoFromRawInfo(update, params),
    )
    .filter(Boolean);

  updateInfos.sort(sortFunction);

  // Now we'll attempt to merge UpdateInfos so that we only have one per key
  const updateForKey: Map<string, ServerUpdateInfo> = new Map();
  const mergedUpdates: ServerUpdateInfo[] = [];
  for (const updateInfo of updateInfos) {
    const key = keyForUpdateInfo(updateInfo);
    if (!key) {
      mergedUpdates.push(updateInfo);
      continue;
    }
    const typesOfReplacedUpdatesForMatchingKey =
      updateSpecs[updateInfo.type].typesOfReplacedUpdatesForMatchingKey;
    const currentUpdateInfo = updateForKey.get(key);
    if (
      !currentUpdateInfo ||
      typesOfReplacedUpdatesForMatchingKey === 'all_types' ||
      typesOfReplacedUpdatesForMatchingKey?.has(currentUpdateInfo.type)
    ) {
      updateForKey.set(key, updateInfo);
    }
  }
  for (const [, updateInfo] of updateForKey) {
    mergedUpdates.push(updateInfo);
  }
  mergedUpdates.sort(sortFunction);

  return { updateInfos: mergedUpdates, userInfos: userInfosResult ?? {} };
}

type PublishInfo = {
  updateTarget: UpdateTarget,
  rawUpdateInfos: RawUpdateInfo[],
};
async function redisPublish(
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
  const types = updateSpecs[updateData.type].deleteCondition;
  if (!types) {
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
