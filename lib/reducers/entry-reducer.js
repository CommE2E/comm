// @flow

import type { BaseAction } from '../types/redux-types';
import type {
  RawEntryInfo,
  EntryStore,
  CalendarQuery,
  CalendarResult,
} from '../types/entry-types';
import { type RawThreadInfo } from '../types/thread-types';
import {
  updateTypes,
  type UpdateInfo,
  processUpdatesActionType,
} from '../types/update-types';
import {
  type EntryInconsistencyClientResponse,
  type ServerRequest,
  serverRequestTypes,
  clearDeliveredClientResponsesActionType,
  processServerRequestsActionType,
} from '../types/request-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';

import _flow from 'lodash/fp/flow';
import _map from 'lodash/fp/map';
import _pickBy from 'lodash/fp/pickBy';
import _omitBy from 'lodash/fp/omitBy';
import _mapValues from 'lodash/fp/mapValues';
import _filter from 'lodash/fp/filter';
import _union from 'lodash/fp/union';
import _mapKeys from 'lodash/fp/mapKeys';
import _groupBy from 'lodash/fp/groupBy';
import _isEqual from 'lodash/fp/isEqual';
import _isEmpty from 'lodash/fp/isEmpty';
import _sortBy from 'lodash/fp/sortBy';
import invariant from 'invariant';

import { dateString } from '../utils/date-utils';
import { setNewSessionActionType } from '../utils/action-utils';
import {
  fetchEntriesActionTypes,
  updateCalendarQueryActionTypes,
  createLocalEntryActionType,
  createEntryActionTypes,
  saveEntryActionTypes,
  concurrentModificationResetActionType,
  deleteEntryActionTypes,
  fetchRevisionsForEntryActionTypes,
  restoreEntryActionTypes,
} from '../actions/entry-actions';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  resetPasswordActionTypes,
} from '../actions/user-actions';
import {
  deleteThreadActionTypes,
  leaveThreadActionTypes,
  joinThreadActionTypes,
  changeThreadSettingsActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
} from '../actions/thread-actions';
import {
  entryID,
  rawEntryInfoWithinCalendarQuery,
  filterRawEntryInfosByCalendarQuery,
  serverEntryInfosObject,
} from '../shared/entry-utils';
import { threadInFilterList } from '../shared/thread-utils';
import { getConfig } from '../utils/config';
import { reduxLogger } from '../utils/redux-logger';
import { values } from '../utils/objects';
import { sanitizeAction } from '../utils/sanitization';

function daysToEntriesFromEntryInfos(entryInfos: $ReadOnlyArray<RawEntryInfo>) {
  return _flow(
    _sortBy((['id', 'localID']: $ReadOnlyArray<string>)),
    _groupBy(
      (entryInfo: RawEntryInfo) =>
        dateString(entryInfo.year, entryInfo.month, entryInfo.day),
    ),
    _mapValues(
      (entryInfoGroup: RawEntryInfo[]) => _map(entryID)(entryInfoGroup),
    ),
  )([...entryInfos]);
}

function filterExistingDaysToEntriesWithNewEntryInfos(
  oldDaysToEntries: {[id: string]: string[]},
  newEntryInfos: {[id: string]: RawEntryInfo},
) {
  return _mapValues(
    (entryIDs: string[]) => _filter(
      (id: string) => newEntryInfos[id],
    )(entryIDs),
  )(oldDaysToEntries);
}

function mergeNewEntryInfos(
  currentEntryInfos: {[id: string]: RawEntryInfo},
  newEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  threadInfos: {[id: string]: RawThreadInfo},
) {
  const mergedEntryInfos = {};

  for (let rawEntryInfo of newEntryInfos) {
    const serverID = rawEntryInfo.id;
    invariant(serverID, "new entryInfos should have serverID");
    const currentEntryInfo = currentEntryInfos[serverID];
    let newEntryInfo;
    if (currentEntryInfo && currentEntryInfo.localID) {
      newEntryInfo = {
        id: serverID,
        // Try to preserve localIDs. This is because we use them as React
        // keys and changing React keys leads to loss of component state.
        localID: currentEntryInfo.localID,
        threadID: rawEntryInfo.threadID,
        text: rawEntryInfo.text,
        year: rawEntryInfo.year,
        month: rawEntryInfo.month,
        day: rawEntryInfo.day,
        creationTime: rawEntryInfo.creationTime,
        creatorID: rawEntryInfo.creatorID,
        deleted: rawEntryInfo.deleted,
      };
    } else {
      newEntryInfo = {
        id: serverID,
        threadID: rawEntryInfo.threadID,
        text: rawEntryInfo.text,
        year: rawEntryInfo.year,
        month: rawEntryInfo.month,
        day: rawEntryInfo.day,
        creationTime: rawEntryInfo.creationTime,
        creatorID: rawEntryInfo.creatorID,
        deleted: rawEntryInfo.deleted,
      };
    }

    if (_isEqual(currentEntryInfo)(newEntryInfo)) {
      mergedEntryInfos[serverID] = currentEntryInfo;
      continue;
    }

    mergedEntryInfos[serverID] = newEntryInfo;
  }

  for (let id in currentEntryInfos) {
    const newEntryInfo = mergedEntryInfos[id];
    if (!newEntryInfo) {
      mergedEntryInfos[id] = currentEntryInfos[id];
    }
  }

  for (let entryID in mergedEntryInfos) {
    const entryInfo = mergedEntryInfos[entryID];
    if (!threadInFilterList(threadInfos[entryInfo.threadID])) {
      delete mergedEntryInfos[entryID];
    }
  }

  const daysToEntries = daysToEntriesFromEntryInfos(values(mergedEntryInfos));
  return [mergedEntryInfos, daysToEntries];
}

function reduceEntryInfos(
  entryStore: EntryStore,
  action: BaseAction,
  newThreadInfos: {[id: string]: RawThreadInfo},
): EntryStore {
  const {
    entryInfos,
    daysToEntries,
    lastUserInteractionCalendar,
    inconsistencyResponses,
  } = entryStore;
  if (
    action.type === logOutActionTypes.success ||
      action.type === deleteAccountActionTypes.success ||
      action.type === deleteThreadActionTypes.success ||
      action.type === leaveThreadActionTypes.success
  ) {
    const authorizedThreadInfos = _pickBy(threadInFilterList)(newThreadInfos);
    const newEntryInfos = _pickBy(
      (entry: RawEntryInfo) => authorizedThreadInfos[entry.threadID],
    )(entryInfos);
    const newLastUserInteractionCalendar =
      action.type === logOutActionTypes.success ||
      action.type === deleteAccountActionTypes.success
        ? 0
        : lastUserInteractionCalendar;
    if (Object.keys(newEntryInfos).length === Object.keys(entryInfos).length) {
      return {
        entryInfos,
        daysToEntries,
        lastUserInteractionCalendar: newLastUserInteractionCalendar,
        inconsistencyResponses,
      };
    }
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    return {
      entryInfos: newEntryInfos,
      daysToEntries: newDaysToEntries,
      lastUserInteractionCalendar: newLastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (action.type === setNewSessionActionType) {
    const authorizedThreadInfos = _pickBy(threadInFilterList)(newThreadInfos);
    const newEntryInfos = _pickBy(
      (entry: RawEntryInfo) => authorizedThreadInfos[entry.threadID],
    )(entryInfos);
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    const newLastUserInteractionCalendar =
      action.payload.sessionChange.cookieInvalidated
        ? 0
        : lastUserInteractionCalendar;
    if (Object.keys(newEntryInfos).length === Object.keys(entryInfos).length) {
      return {
        entryInfos,
        daysToEntries,
        lastUserInteractionCalendar: newLastUserInteractionCalendar,
        inconsistencyResponses,
      };
    }
    return {
      entryInfos: newEntryInfos,
      daysToEntries: newDaysToEntries,
      lastUserInteractionCalendar: newLastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (action.type === fetchEntriesActionTypes.success) {
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      action.payload.rawEntryInfos,
      newThreadInfos,
    );
    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      lastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (
    action.type === updateCalendarQueryActionTypes.started &&
    action.payload &&
    action.payload.calendarQuery
  ) {
    return {
      entryInfos,
      daysToEntries,
      lastUserInteractionCalendar: Date.now(),
      inconsistencyResponses,
    };
  } else if (action.type === updateCalendarQueryActionTypes.success) {
    const newLastUserInteractionCalendar = action.payload.calendarQuery
      ? Date.now()
      : lastUserInteractionCalendar;
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      action.payload.rawEntryInfos,
      newThreadInfos,
    );
    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      lastUserInteractionCalendar: newLastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (action.type === createLocalEntryActionType) {
    const entryInfo = action.payload;
    const localID = entryInfo.localID;
    invariant(localID, "localID should be set in CREATE_LOCAL_ENTRY");
    const newEntryInfos = {
      ...entryInfos,
      [localID]: entryInfo,
    };
    const dayString =
      dateString(entryInfo.year, entryInfo.month, entryInfo.day);
    const newDaysToEntries = {
      ...daysToEntries,
      [dayString]: _union([localID])(daysToEntries[dayString]),
    };
    return {
      entryInfos: newEntryInfos,
      daysToEntries: newDaysToEntries,
      lastUserInteractionCalendar: Date.now(),
      inconsistencyResponses,
    };
  } else if (action.type === createEntryActionTypes.success) {
    const localID = action.payload.localID;
    const serverID = action.payload.entryID;
    // If an entry with this serverID already got into the store somehow
    // (likely through an unrelated request), we need to dedup them.
    let rekeyedEntryInfos;
    if (entryInfos[serverID]) {
      // It's fair to assume the serverID entry is newer than the localID
      // entry, and this probably won't happen often, so for now we can just
      // keep the serverID entry.
      rekeyedEntryInfos = _omitBy(
        (candidate: RawEntryInfo) => !candidate.id &&
          candidate.localID === localID,
      )(entryInfos);
    } else if (entryInfos[localID]) {
      rekeyedEntryInfos = _mapKeys(
        (oldKey: string) =>
          entryInfos[oldKey].localID === localID ? serverID : oldKey,
      )(entryInfos);
    } else {
      // This happens if the entry is deauthorized before it's saved
      return entryStore;
    }

    const updatedEntryInfos = {
      ...rekeyedEntryInfos,
      [serverID]: {
        ...rekeyedEntryInfos[serverID],
        id: serverID,
        localID,
        text: action.payload.text,
      },
    };
    const newDaysToEntries = daysToEntriesFromEntryInfos(
      values(updatedEntryInfos),
    );

    const updateEntryInfos = mergeUpdateEntryInfos(
      [],
      action.payload.updatesResult.viewerUpdates,
    );
    const [ newUpdatedEntryInfos ] = mergeNewEntryInfos(
      rekeyedEntryInfos,
      updateEntryInfos,
      newThreadInfos,
    );
    const newInconsistencies = findInconsistencies(
      entryInfos,
      action,
      updatedEntryInfos,
      newUpdatedEntryInfos,
      action.payload.calendarQuery,
    );

    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: newDaysToEntries,
      lastUserInteractionCalendar: Date.now(),
      inconsistencyResponses: [
        ...inconsistencyResponses,
        ...newInconsistencies,
      ],
    };
  } else if (action.type === saveEntryActionTypes.success) {
    const serverID = action.payload.entryID;
    if (
      !entryInfos[serverID] ||
      !threadInFilterList(newThreadInfos[entryInfos[serverID].threadID])
    ) {
      // This happens if the entry is deauthorized before it's saved
      return entryStore;
    }
    const updatedEntryInfos = {
      ...entryInfos,
      [serverID]: {
        ...entryInfos[serverID],
        text: action.payload.text,
      },
    };

    const updateEntryInfos = mergeUpdateEntryInfos(
      [],
      action.payload.updatesResult.viewerUpdates,
    );
    const [ newUpdatedEntryInfos ] = mergeNewEntryInfos(
      entryInfos,
      updateEntryInfos,
      newThreadInfos,
    );
    const newInconsistencies = findInconsistencies(
      entryInfos,
      action,
      updatedEntryInfos,
      newUpdatedEntryInfos,
      action.payload.calendarQuery,
    );

    return {
      entryInfos: updatedEntryInfos,
      daysToEntries,
      lastUserInteractionCalendar: Date.now(),
      inconsistencyResponses: [
        ...inconsistencyResponses,
        ...newInconsistencies,
      ],
    };
  } else if (action.type === concurrentModificationResetActionType) {
    const payload = action.payload;
    if (
      !entryInfos[payload.id] ||
      !threadInFilterList(newThreadInfos[entryInfos[payload.id].threadID])
    ) {
      // This happens if the entry is deauthorized before it's restored
      return entryStore;
    }
    const newEntryInfos = {
      ...entryInfos,
      [payload.id]: {
        ...entryInfos[payload.id],
        text: payload.dbText,
      },
    };
    return {
      entryInfos: newEntryInfos,
      daysToEntries,
      lastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (action.type === deleteEntryActionTypes.started) {
    const payload = action.payload;
    const id = payload.serverID && entryInfos[payload.serverID]
      ? payload.serverID
      : payload.localID;
    invariant(id, 'either serverID or localID should be set');
    const newEntryInfos = {
      ...entryInfos,
      [id]: {
        ...entryInfos[id],
        deleted: true,
      },
    };
    return {
      entryInfos: newEntryInfos,
      daysToEntries,
      lastUserInteractionCalendar: Date.now(),
      inconsistencyResponses,
    };
  } else if (action.type === deleteEntryActionTypes.success && action.payload) {
    const { payload } = action;
    const updateEntryInfos = mergeUpdateEntryInfos(
      [],
      payload.updatesResult.viewerUpdates,
    );
    const [ newUpdatedEntryInfos ] = mergeNewEntryInfos(
      entryInfos,
      updateEntryInfos,
      newThreadInfos,
    );
    const newInconsistencies = findInconsistencies(
      entryInfos,
      action,
      entryInfos,
      newUpdatedEntryInfos,
      payload.calendarQuery,
    );
    return {
      entryInfos,
      daysToEntries,
      lastUserInteractionCalendar,
      inconsistencyResponses: [
        ...inconsistencyResponses,
        ...newInconsistencies,
      ],
    };
  } else if (action.type === fetchRevisionsForEntryActionTypes.success) {
    const id = action.payload.entryID;
    if (
      !entryInfos[id] ||
      !threadInFilterList(newThreadInfos[entryInfos[id].threadID])
    ) {
      // This happens if the entry is deauthorized before it's restored
      return entryStore;
    }
    // Make sure the entry is in sync with its latest revision
    const newEntryInfos = {
      ...entryInfos,
      [id]: {
        ...entryInfos[id],
        text: action.payload.text,
        deleted: action.payload.deleted,
      },
    };
    return {
      entryInfos: newEntryInfos,
      daysToEntries,
      lastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (action.type === restoreEntryActionTypes.success) {
    const entryInfo = action.payload.entryInfo;
    const key = entryID(entryInfo);
    const updatedEntryInfos = {
      ...entryInfos,
      [key]: entryInfo,
    };

    const updateEntryInfos = mergeUpdateEntryInfos(
      [],
      action.payload.updatesResult.viewerUpdates,
    );
    const [ newUpdatedEntryInfos ] = mergeNewEntryInfos(
      entryInfos,
      updateEntryInfos,
      newThreadInfos,
    );
    const newInconsistencies = findInconsistencies(
      entryInfos,
      action,
      updatedEntryInfos,
      newUpdatedEntryInfos,
      action.payload.calendarQuery,
    );

    return {
      entryInfos: updatedEntryInfos,
      daysToEntries,
      lastUserInteractionCalendar: Date.now(),
      inconsistencyResponses: [
        ...inconsistencyResponses,
        ...newInconsistencies,
      ],
    };
  } else if (
    action.type === logInActionTypes.success ||
      action.type === resetPasswordActionTypes.success ||
      action.type === joinThreadActionTypes.success
  ) {
    const calendarResult = action.payload.calendarResult;
    if (calendarResult) {
      const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
        entryInfos,
        calendarResult.rawEntryInfos,
        newThreadInfos,
      );
      return {
        entryInfos: updatedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar,
        inconsistencyResponses,
      };
    }
  } else if (action.type === incrementalStateSyncActionType) {
    const updateEntryInfos = mergeUpdateEntryInfos(
      action.payload.deltaEntryInfos,
      action.payload.updatesResult.newUpdates,
    );
    const [ updatedEntryInfos, updatedDaysToEntries ] = mergeNewEntryInfos(
      entryInfos,
      updateEntryInfos,
      newThreadInfos,
    );
    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      lastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (action.type === processUpdatesActionType) {
    const updateEntryInfos = mergeUpdateEntryInfos(
      [],
      action.payload.updatesResult.newUpdates,
    );
    const [ updatedEntryInfos, updatedDaysToEntries ] = mergeNewEntryInfos(
      entryInfos,
      updateEntryInfos,
      newThreadInfos,
    );
    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      lastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (action.type === fullStateSyncActionType) {
    const [ updatedEntryInfos, updatedDaysToEntries ] = mergeNewEntryInfos(
      entryInfos,
      action.payload.rawEntryInfos,
      newThreadInfos,
    );
    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      lastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (
    action.type === changeThreadSettingsActionTypes.success ||
      action.type === removeUsersFromThreadActionTypes.success ||
      action.type === changeThreadMemberRolesActionTypes.success
  ) {
    const authorizedThreadInfos = _pickBy(threadInFilterList)(newThreadInfos);
    const newEntryInfos = _pickBy(
      (entry: RawEntryInfo) => authorizedThreadInfos[entry.threadID],
    )(entryInfos);
    if (Object.keys(newEntryInfos).length === Object.keys(entryInfos).length) {
      return entryStore;
    }
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    return {
      entryInfos: newEntryInfos,
      daysToEntries: newDaysToEntries,
      lastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (action.type === clearDeliveredClientResponsesActionType) {
    const { payload } = action;
    const updatedResponses = inconsistencyResponses.filter(
      response => !payload.clientResponses.includes(response),
    );
    if (updatedResponses.length === inconsistencyResponses.length) {
      return entryStore;
    }
    return {
      entryInfos,
      daysToEntries,
      lastUserInteractionCalendar,
      inconsistencyResponses: updatedResponses,
    };
  } else if (action.type === processServerRequestsActionType) {
    const checkStateRequest = action.payload.serverRequests.find(
      candidate => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (!checkStateRequest || !checkStateRequest.stateChanges) {
      return entryStore;
    }
    const { rawEntryInfos, deleteEntryIDs } = checkStateRequest.stateChanges;
    if (!rawEntryInfos && !deleteEntryIDs) {
      return entryStore;
    }

    let updatedEntryInfos = { ...entryInfos };
    if (deleteEntryIDs) {
      for (let deleteEntryID of deleteEntryIDs) {
        delete updatedEntryInfos[deleteEntryID];
      }
    }

    let updatedDaysToEntries;
    if (rawEntryInfos) {
      [ updatedEntryInfos, updatedDaysToEntries ] = mergeNewEntryInfos(
        updatedEntryInfos,
        rawEntryInfos,
        newThreadInfos,
      );
    } else {
      updatedDaysToEntries = daysToEntriesFromEntryInfos(
        values(updatedEntryInfos),
      );
    }

    const newInconsistencies = findInconsistencies(
      entryInfos,
      action,
      entryInfos,
      updatedEntryInfos,
      action.payload.calendarQuery,
    );
    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      lastUserInteractionCalendar,
      inconsistencyResponses: [
        ...inconsistencyResponses,
        ...newInconsistencies,
      ],
    };
  }
  return entryStore;
}

function mergeUpdateEntryInfos(
  entryInfos: $ReadOnlyArray<RawEntryInfo>,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
): RawEntryInfo[] {
  const entryIDs = new Set(entryInfos.map(entryInfo => entryInfo.id));
  const mergedEntryInfos = [...entryInfos];
  for (let updateInfo of newUpdates) {
    if (updateInfo.type === updateTypes.JOIN_THREAD) {
      for (let entryInfo of updateInfo.rawEntryInfos) {
        if (entryIDs.has(entryInfo.id)) {
          continue;
        }
        mergedEntryInfos.push(entryInfo);
        entryIDs.add(entryInfo.id);
      }
    } else if (updateInfo.type === updateTypes.UPDATE_ENTRY) {
      const { entryInfo } = updateInfo;
      if (entryIDs.has(entryInfo.id)) {
        continue;
      }
      mergedEntryInfos.push(entryInfo);
      entryIDs.add(entryInfo.id);
    }
  }
  return mergedEntryInfos;
}

const emptyArray = [];
function findInconsistencies(
  beforeAction: {[id: string]: RawEntryInfo},
  action: BaseAction,
  oldResult: {[id: string]: RawEntryInfo},
  newResult: {[id: string]: RawEntryInfo},
  calendarQuery: CalendarQuery,
): EntryInconsistencyClientResponse[] {
  // We don't want to bother reporting an inconsistency if it's just because of
  // extraneous EntryInfos (not within the current calendarQuery) on either side
  const filteredPollResult = filterRawEntryInfosByCalendarQuery(
    serverEntryInfosObject(values(oldResult)),
    calendarQuery,
  );
  const filteredPushResult = filterRawEntryInfosByCalendarQuery(
    serverEntryInfosObject(values(newResult)),
    calendarQuery,
  );
  if (_isEqual(filteredPollResult)(filteredPushResult)) {
    return emptyArray;
  }
  if (action.type === clearDeliveredClientResponsesActionType) {
    // We can get a memory leak if we include a previous
    // EntryInconsistencyClientResponse in this one
    action = {
      type: "CLEAR_DELIVERED_CLIENT_RESPONSES",
      payload: {
        ...action.payload,
        clientResponses: [],
      },
    };
  }
  return [{
    type: serverRequestTypes.ENTRY_INCONSISTENCY,
    platformDetails: getConfig().platformDetails,
    beforeAction,
    action: sanitizeAction(action),
    calendarQuery,
    pollResult: oldResult,
    pushResult: newResult,
    lastActionTypes: reduxLogger.interestingActionTypes,
    time: Date.now(),
  }];
}

export {
  daysToEntriesFromEntryInfos,
  reduceEntryInfos,
};
