// @flow

import invariant from 'invariant';
import _flow from 'lodash/fp/flow.js';
import _groupBy from 'lodash/fp/groupBy.js';
import _isEqual from 'lodash/fp/isEqual.js';
import _map from 'lodash/fp/map.js';
import _mapKeys from 'lodash/fp/mapKeys.js';
import _mapValues from 'lodash/fp/mapValues.js';
import _omitBy from 'lodash/fp/omitBy.js';
import _pickBy from 'lodash/fp/pickBy.js';
import _sortBy from 'lodash/fp/sortBy.js';

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
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
import {
  deleteThreadActionTypes,
  leaveThreadActionTypes,
  joinThreadActionTypes,
  changeThreadSettingsActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  newThreadActionTypes,
} from '../actions/thread-actions.js';
import { fetchPendingUpdatesActionTypes } from '../actions/update-actions.js';
import {
  keyserverAuthActionTypes,
  deleteKeyserverAccountActionTypes,
  legacyLogInActionTypes,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { EntryStoreOperation } from '../ops/entries-store-ops.js';
import { entryStoreOpsHandlers } from '../ops/entries-store-ops.js';
import { entryID } from '../shared/entry-utils.js';
import { stateSyncSpecs } from '../shared/state-sync/state-sync-specs.js';
import { threadInFilterList } from '../shared/thread-utils.js';
import { updateSpecs } from '../shared/updates/update-specs.js';
import { processDMOpsActionType } from '../types/dm-ops.js';
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
  stateSyncPayloadTypes,
  type ClientStateSyncIncrementalSocketResult,
  type StateSyncIncrementalActionPayload,
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

function mergeNewEntryInfosOps(
  currentEntryInfos: { +[id: string]: RawEntryInfo },
  currentDaysToEntries: ?{ +[day: string]: string[] },
  newEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  threadInfos: RawThreadInfos,
): $ReadOnlyArray<EntryStoreOperation> {
  const mergedEntryInfos: { [string]: RawEntryInfo } = {};

  const ops: Array<EntryStoreOperation> = [];
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

    if (rawEntryInfo.thick) {
      newEntryInfo = {
        ...newEntryInfo,
        thick: rawEntryInfo.thick,
        lastUpdatedTime: rawEntryInfo.lastUpdatedTime,
      };
    }

    if (_isEqual(currentEntryInfo)(newEntryInfo)) {
      mergedEntryInfos[serverID] = currentEntryInfo;
    } else {
      ops.push({
        type: 'replace_entry',
        payload: {
          id: serverID,
          entry: newEntryInfo,
        },
      });
      mergedEntryInfos[serverID] = newEntryInfo;
    }
  }

  for (const id in currentEntryInfos) {
    const newEntryInfo = mergedEntryInfos[id];
    if (!newEntryInfo) {
      mergedEntryInfos[id] = currentEntryInfos[id];
    }
  }

  const entriesFromOutsideFilterList = Object.entries(mergedEntryInfos)
    .filter(([, entry]) => !threadInFilterList(threadInfos[entry.threadID]))
    .map(([id]) => id);
  if (entriesFromOutsideFilterList.length > 0) {
    ops.push({
      type: 'remove_entries',
      payload: {
        ids: entriesFromOutsideFilterList,
      },
    });
  }

  return ops;
}

type ReduceEntryInfosResult = {
  +entryStore: EntryStore,
  +entryStoreOperations: $ReadOnlyArray<EntryStoreOperation>,
  +reportCreationRequests: $ReadOnlyArray<ClientEntryInconsistencyReportCreationRequest>,
};

function handleIncrementalStateSync(
  entryStore: EntryStore,
  newThreadInfos: RawThreadInfos,
  payload:
    | ClientStateSyncIncrementalSocketResult
    | StateSyncIncrementalActionPayload,
): ReduceEntryInfosResult {
  const { entryInfos, daysToEntries } = entryStore;
  const { deletedEntryIDs, deltaEntryInfos, updatesResult } = payload;
  const mergeEntriesOps = mergeNewEntryInfosOps(
    entryInfos,
    daysToEntries,
    mergeUpdateEntryInfos(deltaEntryInfos, updatesResult.newUpdates),
    newThreadInfos,
  );
  const updatedEntryInfos = entryStoreOpsHandlers.processStoreOperations(
    entryStore,
    mergeEntriesOps,
  ).entryInfos;
  const markAsDeletedOps = markDeletedEntries(
    updatedEntryInfos,
    deletedEntryIDs,
  );
  const ops = [...mergeEntriesOps, ...markAsDeletedOps];
  return {
    entryStore: entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
    entryStoreOperations: ops,
    reportCreationRequests: [],
  };
}

function reduceEntryInfos(
  entryStore: EntryStore,
  action: BaseAction,
  newThreadInfos: RawThreadInfos,
): ReduceEntryInfosResult {
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
      return {
        entryStore,
        entryStoreOperations: [],
        reportCreationRequests: [],
      };
    }
    const ops = [
      { type: 'remove_all_entries' },
      ...Object.entries(newEntryInfos).map(([id, entry]) => ({
        type: 'replace_entry',
        payload: {
          id,
          entry,
        },
      })),
    ];
    return {
      entryStore: entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (action.type === setNewSessionActionType) {
    const authorizedThreadInfos = _pickBy(threadInFilterList)(newThreadInfos);
    const newEntryInfos = _pickBy(
      (entry: RawEntryInfo) => authorizedThreadInfos[entry.threadID],
    )(entryInfos);
    let newLastUserInteractionCalendar = lastUserInteractionCalendar;
    if (
      action.payload.sessionChange.cookieInvalidated &&
      action.payload.keyserverID === authoritativeKeyserverID() &&
      relyingOnAuthoritativeKeyserver
    ) {
      newLastUserInteractionCalendar = 0;
    }

    if (Object.keys(newEntryInfos).length === Object.keys(entryInfos).length) {
      return {
        entryStore: {
          entryInfos,
          daysToEntries,
          lastUserInteractionCalendar: newLastUserInteractionCalendar,
        },
        entryStoreOperations: [],
        reportCreationRequests: [],
      };
    }
    const ops = [
      { type: 'remove_all_entries' },
      ...Object.entries(newEntryInfos).map(([id, entry]) => ({
        type: 'replace_entry',
        payload: {
          id,
          entry,
        },
      })),
    ];
    return {
      entryStore: {
        ...entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
        lastUserInteractionCalendar: newLastUserInteractionCalendar,
      },
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (action.type === fetchEntriesActionTypes.success) {
    const ops = mergeNewEntryInfosOps(
      entryInfos,
      daysToEntries,
      action.payload.rawEntryInfos,
      newThreadInfos,
    );
    return {
      entryStore: entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (
    action.type === updateCalendarQueryActionTypes.started &&
    action.payload &&
    action.payload.calendarQuery
  ) {
    return {
      entryStore: {
        entryInfos,
        daysToEntries,
        lastUserInteractionCalendar: Date.now(),
      },
      entryStoreOperations: [],
      reportCreationRequests: [],
    };
  } else if (action.type === updateCalendarQueryActionTypes.success) {
    const newLastUserInteractionCalendar = action.payload.calendarQuery
      ? Date.now()
      : lastUserInteractionCalendar;
    const mergeEntriesOps = mergeNewEntryInfosOps(
      entryInfos,
      daysToEntries,
      action.payload.rawEntryInfos,
      newThreadInfos,
    );
    const updatedEntryInfos = entryStoreOpsHandlers.processStoreOperations(
      entryStore,
      mergeEntriesOps,
    ).entryInfos;
    const markAsDeletedOps = markDeletedEntries(
      updatedEntryInfos,
      action.payload.deletedEntryIDs,
    );
    const ops = [...mergeEntriesOps, ...markAsDeletedOps];
    return {
      entryStore: {
        ...entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
        lastUserInteractionCalendar: newLastUserInteractionCalendar,
      },
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (action.type === createLocalEntryActionType) {
    const entryInfo = action.payload;
    const localID = entryInfo.localID;
    invariant(localID, 'localID should be set in CREATE_LOCAL_ENTRY');
    const ops = [
      {
        type: 'replace_entry',
        payload: {
          id: localID,
          entry: entryInfo,
        },
      },
    ];
    return {
      entryStore: {
        ...entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
        lastUserInteractionCalendar: Date.now(),
      },
      entryStoreOperations: ops,
      reportCreationRequests: [],
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
        (candidate: RawEntryInfo) =>
          !candidate.id && candidate.localID === localID,
      )(entryInfos);
    } else if (entryInfos[localID]) {
      rekeyedEntryInfos = _mapKeys((oldKey: string) =>
        entryInfos[oldKey].localID === localID ? serverID : oldKey,
      )(entryInfos);
    } else {
      // This happens if the entry is deauthorized before it's saved
      return {
        entryStore,
        entryStoreOperations: [],
        reportCreationRequests: [],
      };
    }

    const ops = [
      ...mergeNewEntryInfosOps(
        rekeyedEntryInfos,
        null,
        mergeUpdateEntryInfos([], action.payload.updatesResult.viewerUpdates),
        newThreadInfos,
      ),
      {
        type: 'remove_entries',
        payload: {
          ids: [localID],
        },
      },
    ];
    return {
      entryStore: {
        ...entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
        lastUserInteractionCalendar: Date.now(),
      },
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (action.type === saveEntryActionTypes.success) {
    const serverID = action.payload.entryID;
    if (
      !entryInfos[serverID] ||
      !threadInFilterList(newThreadInfos[entryInfos[serverID].threadID])
    ) {
      // This happens if the entry is deauthorized before it's saved
      return {
        entryStore,
        entryStoreOperations: [],
        reportCreationRequests: [],
      };
    }

    const ops = mergeNewEntryInfosOps(
      entryInfos,
      daysToEntries,
      mergeUpdateEntryInfos([], action.payload.updatesResult.viewerUpdates),
      newThreadInfos,
    );

    return {
      entryStore: {
        ...entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
        lastUserInteractionCalendar: Date.now(),
      },
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (action.type === concurrentModificationResetActionType) {
    const { payload } = action;
    if (
      !entryInfos[payload.id] ||
      !threadInFilterList(newThreadInfos[entryInfos[payload.id].threadID])
    ) {
      // This happens if the entry is deauthorized before it's restored
      return {
        entryStore,
        entryStoreOperations: [],
        reportCreationRequests: [],
      };
    }
    const ops = [
      {
        type: 'replace_entry',
        payload: {
          id: payload.id,
          entry: {
            ...entryInfos[payload.id],
            text: payload.dbText,
          },
        },
      },
    ];
    return {
      entryStore: entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (action.type === deleteEntryActionTypes.started) {
    const payload = action.payload;
    const id =
      payload.serverID && entryInfos[payload.serverID]
        ? payload.serverID
        : payload.localID;
    invariant(id, 'either serverID or localID should be set');
    const ops = [
      {
        type: 'replace_entry',
        payload: {
          id,
          entry: {
            ...entryInfos[id],
            deleted: true,
          },
        },
      },
    ];
    return {
      entryStore: {
        ...entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
        lastUserInteractionCalendar: Date.now(),
      },
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (action.type === deleteEntryActionTypes.success) {
    const { payload } = action;
    if (payload) {
      const ops = mergeNewEntryInfosOps(
        entryInfos,
        daysToEntries,
        mergeUpdateEntryInfos([], payload.updatesResult.viewerUpdates),
        newThreadInfos,
      );
      return {
        entryStore: entryStoreOpsHandlers.processStoreOperations(
          entryStore,
          ops,
        ),
        entryStoreOperations: ops,
        reportCreationRequests: [],
      };
    }
  } else if (action.type === fetchRevisionsForEntryActionTypes.success) {
    const id = action.payload.entryID;
    if (
      !entryInfos[id] ||
      !threadInFilterList(newThreadInfos[entryInfos[id].threadID])
    ) {
      // This happens if the entry is deauthorized before it's restored
      return {
        entryStore,
        entryStoreOperations: [],
        reportCreationRequests: [],
      };
    }
    // Make sure the entry is in sync with its latest revision
    const ops = [
      {
        type: 'replace_entry',
        payload: {
          id,
          entry: {
            ...entryInfos[id],
            text: action.payload.text,
            deleted: action.payload.deleted,
          },
        },
      },
    ];
    return {
      entryStore: entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (action.type === restoreEntryActionTypes.success) {
    const ops = mergeNewEntryInfosOps(
      entryInfos,
      daysToEntries,
      mergeUpdateEntryInfos([], action.payload.updatesResult.viewerUpdates),
      newThreadInfos,
    );
    return {
      entryStore: {
        ...entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
        lastUserInteractionCalendar: Date.now(),
      },
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (
    action.type === legacyLogInActionTypes.success ||
    action.type === keyserverAuthActionTypes.success
  ) {
    const { calendarResult } = action.payload;
    if (calendarResult) {
      const ops = mergeNewEntryInfosOps(
        entryInfos,
        daysToEntries,
        calendarResult.rawEntryInfos,
        newThreadInfos,
      );
      return {
        entryStore: entryStoreOpsHandlers.processStoreOperations(
          entryStore,
          ops,
        ),
        entryStoreOperations: ops,
        reportCreationRequests: [],
      };
    }
  } else if (action.type === incrementalStateSyncActionType) {
    return handleIncrementalStateSync(
      entryStore,
      newThreadInfos,
      action.payload,
    );
  } else if (action.type === fetchPendingUpdatesActionTypes.success) {
    const { payload } = action;
    if (payload.type === stateSyncPayloadTypes.INCREMENTAL) {
      return handleIncrementalStateSync(entryStore, newThreadInfos, payload);
    } else {
      const ops = mergeNewEntryInfosOps(
        entryInfos,
        daysToEntries,
        payload.rawEntryInfos,
        newThreadInfos,
      );
      return {
        entryStore: entryStoreOpsHandlers.processStoreOperations(
          entryStore,
          ops,
        ),
        entryStoreOperations: ops,
        reportCreationRequests: [],
      };
    }
  } else if (
    action.type === processUpdatesActionType ||
    action.type === joinThreadActionTypes.success ||
    action.type === newThreadActionTypes.success
  ) {
    const ops = mergeNewEntryInfosOps(
      entryInfos,
      daysToEntries,
      mergeUpdateEntryInfos([], action.payload.updatesResult.newUpdates),
      newThreadInfos,
    );
    return {
      entryStore: entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (action.type === fullStateSyncActionType) {
    const ops = mergeNewEntryInfosOps(
      entryInfos,
      daysToEntries,
      action.payload.rawEntryInfos,
      newThreadInfos,
    );
    return {
      entryStore: entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
      entryStoreOperations: ops,
      reportCreationRequests: [],
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
      return {
        entryStore,
        entryStoreOperations: [],
        reportCreationRequests: [],
      };
    }
    const ops = [
      {
        type: 'remove_all_entries',
      },
      ...Object.entries(newEntryInfos).map(([id, entry]) => ({
        type: 'replace_entry',
        payload: {
          id,
          entry,
        },
      })),
    ];
    return {
      entryStore: entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  } else if (action.type === processServerRequestsActionType) {
    const checkStateRequest = action.payload.serverRequests.find(
      candidate => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (!checkStateRequest || !checkStateRequest.stateChanges) {
      return {
        entryStore,
        entryStoreOperations: [],
        reportCreationRequests: [],
      };
    }
    const { rawEntryInfos, deleteEntryIDs } = checkStateRequest.stateChanges;
    if (!rawEntryInfos && !deleteEntryIDs) {
      return {
        entryStore,
        entryStoreOperations: [],
        reportCreationRequests: [],
      };
    }

    const ops: Array<EntryStoreOperation> = [];
    let updatedEntryInfos = entryInfos;
    if (deleteEntryIDs) {
      ops.push({
        type: 'remove_entries',
        payload: {
          ids: deleteEntryIDs,
        },
      });
      updatedEntryInfos = entryStoreOpsHandlers.processStoreOperations(
        entryStore,
        ops,
      ).entryInfos;
    }

    if (rawEntryInfos) {
      ops.push(
        ...mergeNewEntryInfosOps(
          updatedEntryInfos,
          null,
          rawEntryInfos,
          newThreadInfos,
        ),
      );
    }

    const newStore = entryStoreOpsHandlers.processStoreOperations(
      entryStore,
      ops,
    );
    const newInconsistencies = stateSyncSpecs.entries.findStoreInconsistencies(
      action,
      entryInfos,
      newStore.entryInfos,
    );

    return {
      entryStore: newStore,
      entryStoreOperations: ops,
      reportCreationRequests: newInconsistencies,
    };
  } else if (action.type === setClientDBStoreActionType) {
    const entryInfosFromDB = action.payload.entries ?? {};
    const newStore = {
      entryInfos: entryInfosFromDB,
      daysToEntries: daysToEntriesFromEntryInfos(values(entryInfosFromDB)),
      lastUserInteractionCalendar,
    };
    return {
      entryStore: newStore,
      entryStoreOperations: [],
      reportCreationRequests: [],
    };
  } else if (action.type === processDMOpsActionType) {
    const ops = mergeNewEntryInfosOps(
      entryInfos,
      daysToEntries,
      mergeUpdateEntryInfos([], action.payload.updateInfos),
      newThreadInfos,
    );
    return {
      entryStore: entryStoreOpsHandlers.processStoreOperations(entryStore, ops),
      entryStoreOperations: ops,
      reportCreationRequests: [],
    };
  }
  return {
    entryStore,
    entryStoreOperations: [],
    reportCreationRequests: [],
  };
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
): $ReadOnlyArray<EntryStoreOperation> {
  const ops = [];
  for (const deletedEntryID of deletedEntryIDs) {
    const entryInfo = entryInfos[deletedEntryID];
    if (!entryInfo || entryInfo.deleted) {
      continue;
    }
    ops.push({
      type: 'replace_entry',
      payload: {
        id: deletedEntryID,
        entry: {
          ...entryInfo,
          deleted: true,
        },
      },
    });
  }
  return ops;
}

export { daysToEntriesFromEntryInfos, reduceEntryInfos };
