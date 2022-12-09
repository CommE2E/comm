// @flow
import invariant from 'invariant';
import _filter from 'lodash/fp/filter';
import _flow from 'lodash/fp/flow';
import _groupBy from 'lodash/fp/groupBy';
import _isEqual from 'lodash/fp/isEqual';
import _map from 'lodash/fp/map';
import _mapKeys from 'lodash/fp/mapKeys';
import _mapValues from 'lodash/fp/mapValues';
import _omitBy from 'lodash/fp/omitBy';
import _pickBy from 'lodash/fp/pickBy';
import _sortBy from 'lodash/fp/sortBy';
import _union from 'lodash/fp/union';

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
  deleteThreadActionTypes,
  leaveThreadActionTypes,
  joinThreadActionTypes,
  changeThreadSettingsActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  newThreadActionTypes,
} from '../actions/thread-actions';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  siweActionTypes,
} from '../actions/user-actions';
import {
  entryID,
  filterRawEntryInfosByCalendarQuery,
  serverEntryInfosObject,
} from '../shared/entry-utils';
import { threadInFilterList } from '../shared/thread-utils';
import type {
  RawEntryInfo,
  EntryStore,
  CalendarQuery,
} from '../types/entry-types';
import type { BaseAction } from '../types/redux-types';
import {
  type ClientEntryInconsistencyReportCreationRequest,
  reportTypes,
} from '../types/report-types';
import {
  serverRequestTypes,
  processServerRequestsActionType,
} from '../types/request-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';
import { type RawThreadInfo } from '../types/thread-types';
import {
  updateTypes,
  type ClientUpdateInfo,
  processUpdatesActionType,
} from '../types/update-types';
import { actionLogger } from '../utils/action-logger';
import { setNewSessionActionType } from '../utils/action-utils';
import { getConfig } from '../utils/config';
import { dateString } from '../utils/date-utils';
import { values } from '../utils/objects';
import { sanitizeActionSecrets } from '../utils/sanitization';

function daysToEntriesFromEntryInfos(
  entryInfos: $ReadOnlyArray<RawEntryInfo>,
): { [day: string]: string[] } {
  return _flow(
    _sortBy((['id', 'localID']: $ReadOnlyArray<string>)),
    _groupBy((entryInfo: RawEntryInfo) =>
      dateString(entryInfo.year, entryInfo.month, entryInfo.day),
    ),
    _mapValues((entryInfoGroup: $ReadOnlyArray<RawEntryInfo>) =>
      _map(entryID)(entryInfoGroup),
    ),
  )([...entryInfos]);
}

function filterExistingDaysToEntriesWithNewEntryInfos(
  oldDaysToEntries: { +[id: string]: string[] },
  newEntryInfos: { +[id: string]: RawEntryInfo },
) {
  return _mapValues((entryIDs: string[]) =>
    _filter((id: string) => newEntryInfos[id])(entryIDs),
  )(oldDaysToEntries);
}

function mergeNewEntryInfos(
  currentEntryInfos: { +[id: string]: RawEntryInfo },
  currentDaysToEntries: ?{ +[day: string]: string[] },
  newEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  threadInfos: { +[id: string]: RawThreadInfo },
) {
  const mergedEntryInfos = {};
  let someEntryUpdated = false;

  for (const rawEntryInfo of newEntryInfos) {
    const serverID = rawEntryInfo.id;
    invariant(serverID, 'new entryInfos should have serverID');
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
    } else {
      mergedEntryInfos[serverID] = newEntryInfo;
      someEntryUpdated = true;
    }
  }

  for (const id in currentEntryInfos) {
    const newEntryInfo = mergedEntryInfos[id];
    if (!newEntryInfo) {
      mergedEntryInfos[id] = currentEntryInfos[id];
    }
  }

  for (const id in mergedEntryInfos) {
    const entryInfo = mergedEntryInfos[id];
    if (!threadInFilterList(threadInfos[entryInfo.threadID])) {
      someEntryUpdated = true;
      delete mergedEntryInfos[id];
    }
  }

  const daysToEntries =
    !currentDaysToEntries || someEntryUpdated
      ? daysToEntriesFromEntryInfos(values(mergedEntryInfos))
      : currentDaysToEntries;
  const entryInfos = someEntryUpdated ? mergedEntryInfos : currentEntryInfos;
  return [entryInfos, daysToEntries];
}

function reduceEntryInfos(
  entryStore: EntryStore,
  action: BaseAction,
  newThreadInfos: { +[id: string]: RawThreadInfo },
): [EntryStore, $ReadOnlyArray<ClientEntryInconsistencyReportCreationRequest>] {
  const { entryInfos, daysToEntries, lastUserInteractionCalendar } = entryStore;
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
      return [
        {
          entryInfos,
          daysToEntries,
          lastUserInteractionCalendar: newLastUserInteractionCalendar,
        },
        [],
      ];
    }
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    return [
      {
        entryInfos: newEntryInfos,
        daysToEntries: newDaysToEntries,
        lastUserInteractionCalendar: newLastUserInteractionCalendar,
      },
      [],
    ];
  } else if (action.type === setNewSessionActionType) {
    const authorizedThreadInfos = _pickBy(threadInFilterList)(newThreadInfos);
    const newEntryInfos = _pickBy(
      (entry: RawEntryInfo) => authorizedThreadInfos[entry.threadID],
    )(entryInfos);
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    const newLastUserInteractionCalendar = action.payload.sessionChange
      .cookieInvalidated
      ? 0
      : lastUserInteractionCalendar;
    if (Object.keys(newEntryInfos).length === Object.keys(entryInfos).length) {
      return [
        {
          entryInfos,
          daysToEntries,
          lastUserInteractionCalendar: newLastUserInteractionCalendar,
        },
        [],
      ];
    }
    return [
      {
        entryInfos: newEntryInfos,
        daysToEntries: newDaysToEntries,
        lastUserInteractionCalendar: newLastUserInteractionCalendar,
      },
      [],
    ];
  } else if (action.type === fetchEntriesActionTypes.success) {
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      action.payload.rawEntryInfos,
      newThreadInfos,
    );
    return [
      {
        entryInfos: updatedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar,
      },
      [],
    ];
  } else if (
    action.type === updateCalendarQueryActionTypes.started &&
    action.payload &&
    action.payload.calendarQuery
  ) {
    return [
      {
        entryInfos,
        daysToEntries,
        lastUserInteractionCalendar: Date.now(),
      },
      [],
    ];
  } else if (action.type === updateCalendarQueryActionTypes.success) {
    const newLastUserInteractionCalendar = action.payload.calendarQuery
      ? Date.now()
      : lastUserInteractionCalendar;
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      action.payload.rawEntryInfos,
      newThreadInfos,
    );
    const deletionMarkedEntryInfos = markDeletedEntries(
      updatedEntryInfos,
      action.payload.deletedEntryIDs,
    );
    return [
      {
        entryInfos: deletionMarkedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar: newLastUserInteractionCalendar,
      },
      [],
    ];
  } else if (action.type === createLocalEntryActionType) {
    const entryInfo = action.payload;
    const localID = entryInfo.localID;
    invariant(localID, 'localID should be set in CREATE_LOCAL_ENTRY');
    const newEntryInfos = {
      ...entryInfos,
      [localID]: entryInfo,
    };
    const dayString = dateString(
      entryInfo.year,
      entryInfo.month,
      entryInfo.day,
    );
    const newDaysToEntries = {
      ...daysToEntries,
      [dayString]: _union([localID])(daysToEntries[dayString]),
    };
    return [
      {
        entryInfos: newEntryInfos,
        daysToEntries: newDaysToEntries,
        lastUserInteractionCalendar: Date.now(),
      },
      [],
    ];
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
        (candidate: RawEntryInfo) =>
          !candidate.id && candidate.localID === localID,
      )(entryInfos);
    } else if (entryInfos[localID]) {
      rekeyedEntryInfos = _mapKeys((oldKey: string) =>
        entryInfos[oldKey].localID === localID ? serverID : oldKey,
      )(entryInfos);
    } else {
      // This happens if the entry is deauthorized before it's saved
      return [entryStore, []];
    }

    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      rekeyedEntryInfos,
      null,
      mergeUpdateEntryInfos([], action.payload.updatesResult.viewerUpdates),
      newThreadInfos,
    );

    return [
      {
        entryInfos: updatedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar: Date.now(),
      },
      [],
    ];
  } else if (action.type === saveEntryActionTypes.success) {
    const serverID = action.payload.entryID;
    if (
      !entryInfos[serverID] ||
      !threadInFilterList(newThreadInfos[entryInfos[serverID].threadID])
    ) {
      // This happens if the entry is deauthorized before it's saved
      return [entryStore, []];
    }

    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      mergeUpdateEntryInfos([], action.payload.updatesResult.viewerUpdates),
      newThreadInfos,
    );

    return [
      {
        entryInfos: updatedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar: Date.now(),
      },
      [],
    ];
  } else if (action.type === concurrentModificationResetActionType) {
    const { payload } = action;
    if (
      !entryInfos[payload.id] ||
      !threadInFilterList(newThreadInfos[entryInfos[payload.id].threadID])
    ) {
      // This happens if the entry is deauthorized before it's restored
      return [entryStore, []];
    }
    const newEntryInfos = {
      ...entryInfos,
      [payload.id]: {
        ...entryInfos[payload.id],
        text: payload.dbText,
      },
    };
    return [
      {
        entryInfos: newEntryInfos,
        daysToEntries,
        lastUserInteractionCalendar,
      },
      [],
    ];
  } else if (action.type === deleteEntryActionTypes.started) {
    const payload = action.payload;
    const id =
      payload.serverID && entryInfos[payload.serverID]
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
    return [
      {
        entryInfos: newEntryInfos,
        daysToEntries,
        lastUserInteractionCalendar: Date.now(),
      },
      [],
    ];
  } else if (action.type === deleteEntryActionTypes.success && action.payload) {
    const { payload } = action;
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      mergeUpdateEntryInfos([], payload.updatesResult.viewerUpdates),
      newThreadInfos,
    );
    return [
      {
        entryInfos: updatedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar,
      },
      [],
    ];
  } else if (action.type === fetchRevisionsForEntryActionTypes.success) {
    const id = action.payload.entryID;
    if (
      !entryInfos[id] ||
      !threadInFilterList(newThreadInfos[entryInfos[id].threadID])
    ) {
      // This happens if the entry is deauthorized before it's restored
      return [entryStore, []];
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
    return [
      {
        entryInfos: newEntryInfos,
        daysToEntries,
        lastUserInteractionCalendar,
      },
      [],
    ];
  } else if (action.type === restoreEntryActionTypes.success) {
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      mergeUpdateEntryInfos([], action.payload.updatesResult.viewerUpdates),
      newThreadInfos,
    );
    return [
      {
        entryInfos: updatedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar: Date.now(),
      },
      [],
    ];
  } else if (
    action.type === logInActionTypes.success ||
    (action.type === siweActionTypes.success && !action.payload.isNewAccount)
  ) {
    const { calendarResult } = action.payload;
    if (calendarResult) {
      const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
        entryInfos,
        daysToEntries,
        calendarResult.rawEntryInfos,
        newThreadInfos,
      );
      return [
        {
          entryInfos: updatedEntryInfos,
          daysToEntries: updatedDaysToEntries,
          lastUserInteractionCalendar,
        },
        [],
      ];
    }
  } else if (action.type === incrementalStateSyncActionType) {
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      mergeUpdateEntryInfos(
        action.payload.deltaEntryInfos,
        action.payload.updatesResult.newUpdates,
      ),
      newThreadInfos,
    );
    const deletionMarkedEntryInfos = markDeletedEntries(
      updatedEntryInfos,
      action.payload.deletedEntryIDs,
    );
    return [
      {
        entryInfos: deletionMarkedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar,
      },
      [],
    ];
  } else if (
    action.type === processUpdatesActionType ||
    action.type === joinThreadActionTypes.success ||
    action.type === newThreadActionTypes.success
  ) {
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      mergeUpdateEntryInfos([], action.payload.updatesResult.newUpdates),
      newThreadInfos,
    );
    return [
      {
        entryInfos: updatedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar,
      },
      [],
    ];
  } else if (action.type === fullStateSyncActionType) {
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      action.payload.rawEntryInfos,
      newThreadInfos,
    );
    return [
      {
        entryInfos: updatedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar,
      },
      [],
    ];
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
      return [entryStore, []];
    }
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    return [
      {
        entryInfos: newEntryInfos,
        daysToEntries: newDaysToEntries,
        lastUserInteractionCalendar,
      },
      [],
    ];
  } else if (action.type === processServerRequestsActionType) {
    const checkStateRequest = action.payload.serverRequests.find(
      candidate => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (!checkStateRequest || !checkStateRequest.stateChanges) {
      return [entryStore, []];
    }
    const { rawEntryInfos, deleteEntryIDs } = checkStateRequest.stateChanges;
    if (!rawEntryInfos && !deleteEntryIDs) {
      return [entryStore, []];
    }

    let updatedEntryInfos = { ...entryInfos };
    if (deleteEntryIDs) {
      for (const deleteEntryID of deleteEntryIDs) {
        delete updatedEntryInfos[deleteEntryID];
      }
    }

    let updatedDaysToEntries;
    if (rawEntryInfos) {
      [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
        updatedEntryInfos,
        null,
        rawEntryInfos,
        newThreadInfos,
      );
    } else {
      updatedDaysToEntries = daysToEntriesFromEntryInfos(
        values(updatedEntryInfos),
      );
    }

    const newInconsistencies = findInconsistencies(
      action,
      entryInfos,
      updatedEntryInfos,
      action.payload.calendarQuery,
    );

    return [
      {
        entryInfos: updatedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar,
      },
      newInconsistencies,
    ];
  }
  return [entryStore, []];
}

function mergeUpdateEntryInfos(
  entryInfos: $ReadOnlyArray<RawEntryInfo>,
  newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
): RawEntryInfo[] {
  const entryIDs = new Set(entryInfos.map(entryInfo => entryInfo.id));
  const mergedEntryInfos = [...entryInfos];
  for (const updateInfo of newUpdates) {
    if (updateInfo.type === updateTypes.JOIN_THREAD) {
      for (const entryInfo of updateInfo.rawEntryInfos) {
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
  action: BaseAction,
  beforeStateCheck: { +[id: string]: RawEntryInfo },
  afterStateCheck: { +[id: string]: RawEntryInfo },
  calendarQuery: CalendarQuery,
): ClientEntryInconsistencyReportCreationRequest[] {
  // We don't want to bother reporting an inconsistency if it's just because of
  // extraneous EntryInfos (not within the current calendarQuery) on either side
  const filteredBeforeResult = filterRawEntryInfosByCalendarQuery(
    serverEntryInfosObject(values(beforeStateCheck)),
    calendarQuery,
  );
  const filteredAfterResult = filterRawEntryInfosByCalendarQuery(
    serverEntryInfosObject(values(afterStateCheck)),
    calendarQuery,
  );
  if (_isEqual(filteredBeforeResult)(filteredAfterResult)) {
    return emptyArray;
  }
  return [
    {
      type: reportTypes.ENTRY_INCONSISTENCY,
      platformDetails: getConfig().platformDetails,
      beforeAction: beforeStateCheck,
      action: sanitizeActionSecrets(action),
      calendarQuery,
      pushResult: afterStateCheck,
      lastActions: actionLogger.interestingActionSummaries,
      time: Date.now(),
    },
  ];
}

function markDeletedEntries(
  entryInfos: { +[id: string]: RawEntryInfo },
  deletedEntryIDs: $ReadOnlyArray<string>,
): { +[id: string]: RawEntryInfo } {
  let result = entryInfos;
  for (const deletedEntryID of deletedEntryIDs) {
    const entryInfo = entryInfos[deletedEntryID];
    if (!entryInfo || entryInfo.deleted) {
      continue;
    }
    result = {
      ...result,
      [deletedEntryID]: {
        ...entryInfo,
        deleted: true,
      },
    };
  }
  return result;
}

export { daysToEntriesFromEntryInfos, reduceEntryInfos };
