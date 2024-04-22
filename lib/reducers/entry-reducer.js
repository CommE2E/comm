// @flow

import invariant from 'invariant';
import _filter from 'lodash/fp/filter.js';
import _flow from 'lodash/fp/flow.js';
import _groupBy from 'lodash/fp/groupBy.js';
import _isEqual from 'lodash/fp/isEqual.js';
import _map from 'lodash/fp/map.js';
import _mapKeys from 'lodash/fp/mapKeys.js';
import _mapValues from 'lodash/fp/mapValues.js';
import _omitBy from 'lodash/fp/omitBy.js';
import _pickBy from 'lodash/fp/pickBy.js';
import _sortBy from 'lodash/fp/sortBy.js';
import _union from 'lodash/fp/union.js';

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
} from '../actions/entry-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  deleteThreadActionTypes,
  leaveThreadActionTypes,
  joinThreadActionTypes,
  changeThreadSettingsActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  newThreadActionTypes,
} from '../actions/thread-actions.js';
import {
  keyserverAuthActionTypes,
  deleteKeyserverAccountActionTypes,
  legacyLogInActionTypes,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import { entryID } from '../shared/entry-utils.js';
import { stateSyncSpecs } from '../shared/state-sync/state-sync-specs.js';
import { threadInFilterList } from '../shared/thread-utils.js';
import { updateSpecs } from '../shared/updates/update-specs.js';
import type { RawEntryInfo, EntryStore } from '../types/entry-types.js';
import type { BaseAction } from '../types/redux-types.js';
import { type ClientEntryInconsistencyReportCreationRequest } from '../types/report-types.js';
import {
  serverRequestTypes,
  processServerRequestsActionType,
} from '../types/request-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import type { RawThreadInfos } from '../types/thread-types.js';
import {
  type ClientUpdateInfo,
  processUpdatesActionType,
} from '../types/update-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { dateString } from '../utils/date-utils.js';
import { values } from '../utils/objects.js';
import { relyingOnAuthoritativeKeyserver } from '../utils/services-utils.js';

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
  threadInfos: RawThreadInfos,
) {
  const mergedEntryInfos: { [string]: RawEntryInfo } = {};
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
  newThreadInfos: RawThreadInfos,
): [EntryStore, $ReadOnlyArray<ClientEntryInconsistencyReportCreationRequest>] {
  const { entryInfos, daysToEntries, lastUserInteractionCalendar } = entryStore;
  if (
    action.type === deleteKeyserverAccountActionTypes.success ||
    action.type === deleteThreadActionTypes.success ||
    action.type === leaveThreadActionTypes.success
  ) {
    const authorizedThreadInfos = _pickBy(threadInFilterList)(newThreadInfos);
    const newEntryInfos = _pickBy(
      (entry: RawEntryInfo) => authorizedThreadInfos[entry.threadID],
    )(entryInfos);

    if (Object.keys(newEntryInfos).length === Object.keys(entryInfos).length) {
      return [
        {
          entryInfos,
          daysToEntries,
          lastUserInteractionCalendar,
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
        lastUserInteractionCalendar,
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
    let newLastUserInteractionCalendar = lastUserInteractionCalendar;
    if (
      action.payload.sessionChange.cookieInvalidated &&
      action.payload.keyserverID === authoritativeKeyserverID() &&
      relyingOnAuthoritativeKeyserver
    ) {
      newLastUserInteractionCalendar = 0;
    }

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
      [(localID: string)]: entryInfo,
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
      [(id: string)]: {
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
  } else if (action.type === deleteEntryActionTypes.success) {
    const { payload } = action;
    if (payload) {
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
    }
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
    action.type === legacyLogInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === keyserverAuthActionTypes.success
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

    const updatedEntryInfos: { [string]: RawEntryInfo } = { ...entryInfos };
    if (deleteEntryIDs) {
      for (const deleteEntryID of deleteEntryIDs) {
        delete updatedEntryInfos[deleteEntryID];
      }
    }

    let mergedEntryInfos: { +[string]: RawEntryInfo };
    let mergedDaysToEntries;
    if (rawEntryInfos) {
      [mergedEntryInfos, mergedDaysToEntries] = mergeNewEntryInfos(
        updatedEntryInfos,
        null,
        rawEntryInfos,
        newThreadInfos,
      );
    } else {
      mergedEntryInfos = updatedEntryInfos;
      mergedDaysToEntries = daysToEntriesFromEntryInfos(
        values(updatedEntryInfos),
      );
    }

    const newInconsistencies = stateSyncSpecs.entries.findStoreInconsistencies(
      action,
      entryInfos,
      mergedEntryInfos,
    );

    return [
      {
        entryInfos: mergedEntryInfos,
        daysToEntries: mergedDaysToEntries,
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
  const entryIDs = new Set(
    entryInfos.map(entryInfo => entryInfo.id).filter(Boolean),
  );
  const mergedEntryInfos = [...entryInfos];
  for (const updateInfo of newUpdates) {
    updateSpecs[updateInfo.type].mergeEntryInfos?.(
      entryIDs,
      mergedEntryInfos,
      updateInfo,
    );
  }
  return mergedEntryInfos;
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
