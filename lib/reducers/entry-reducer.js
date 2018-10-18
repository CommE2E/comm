// @flow

import type { BaseAction } from '../types/redux-types';
import type {
  RawEntryInfo,
  EntryStore,
  CalendarQuery,
  CalendarResult,
} from '../types/entry-types';
import { type RawThreadInfo } from '../types/thread-types';
import { updateTypes, type UpdateInfo } from '../types/update-types';
import {
  type EntryInconsistencyClientResponse,
  type ServerRequest,
  serverRequestTypes,
  clearDeliveredClientResponsesActionType,
  processServerRequestsActionType,
} from '../types/request-types';
import { pingResponseTypes } from '../types/ping-types';

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
import invariant from 'invariant';

import { dateString } from '../utils/date-utils';
import { setHighestLocalID } from '../utils/local-ids';
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
  registerActionTypes,
} from '../actions/user-actions';
import {
  deleteThreadActionTypes,
  leaveThreadActionTypes,
  joinThreadActionTypes,
  changeThreadSettingsActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
} from '../actions/thread-actions';
import { pingActionTypes } from '../actions/ping-actions';
import { rehydrateActionType } from '../types/redux-types';
import {
  entryID,
  rawEntryInfoWithinCalendarQuery,
  filterRawEntryInfosByCalendarQuery,
} from '../shared/entry-utils';
import { threadInFilterList } from '../shared/thread-utils';
import { getConfig } from '../utils/config';
import { reduxLogger } from '../utils/redux-logger';
import { values } from '../utils/objects';
import { sanitizeAction } from '../utils/sanitization';

function daysToEntriesFromEntryInfos(entryInfos: $ReadOnlyArray<RawEntryInfo>) {
  return _flow(
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
  pingInfo?: {|
    prevEntryInfos: {[id: string]: RawEntryInfo},
    calendarQuery: CalendarQuery,
  |},
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

    if (pingInfo) {
      const prevEntryInfo = pingInfo.prevEntryInfos[serverID];
      // If the entry at the time of the start of the ping is the same as what
      // was returned, but the current state is different, then it's likely that
      // an action mutated the state after the ping result was fetched on the
      // server. We should keep the mutated (current) state.
      if (_isEqual(prevEntryInfo)(newEntryInfo)) {
        if (currentEntryInfo) {
          mergedEntryInfos[serverID] = currentEntryInfo;
        }
        continue;
      }
    }

    mergedEntryInfos[serverID] = newEntryInfo;
  }

  for (let id in currentEntryInfos) {
    const newEntryInfo = mergedEntryInfos[id];
    if (newEntryInfo) {
      continue;
    }
    const currentEntryInfo = currentEntryInfos[id];
    if (pingInfo) {
      const prevEntryInfo = pingInfo.prevEntryInfos[id];
      // If an EntryInfo was present at the start of the ping, and is currently
      // present, but did not appear in the ping result, then there are three
      // possibilities:
      // - It is outside the scope of the CalendarQuery.
      // - It is a local entry that has not been committed to the server yet, in
      //   which case we should keep it.
      // - It has been deleted on the server side.
      // We should delete it only in the third case.
      if (prevEntryInfo && prevEntryInfo.id) {
        const withinCalendarQueryRange = rawEntryInfoWithinCalendarQuery(
          currentEntryInfo,
          pingInfo.calendarQuery,
        );
        if (withinCalendarQueryRange) {
          continue;
        }
      }
    }
    mergedEntryInfos[id] = currentEntryInfo;
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
    actualizedCalendarQuery,
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
        actualizedCalendarQuery,
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
      actualizedCalendarQuery,
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
        actualizedCalendarQuery,
        lastUserInteractionCalendar: newLastUserInteractionCalendar,
        inconsistencyResponses,
      };
    }
    return {
      entryInfos: newEntryInfos,
      daysToEntries: newDaysToEntries,
      actualizedCalendarQuery,
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
      actualizedCalendarQuery,
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
      actualizedCalendarQuery: action.payload.calendarQuery,
      lastUserInteractionCalendar: Date.now(),
      inconsistencyResponses,
    };
  } else if (
    action.type === logInActionTypes.started ||
    action.type === resetPasswordActionTypes.started ||
    action.type === registerActionTypes.started ||
    action.type === pingActionTypes.started
  ) {
    return {
      entryInfos,
      daysToEntries,
      actualizedCalendarQuery: action.payload.calendarQuery,
      lastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (action.type === updateCalendarQueryActionTypes.success) {
    const newActualizedCalendarQuery = action.payload.calendarQuery
      ? action.payload.calendarQuery
      : actualizedCalendarQuery;
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
      actualizedCalendarQuery: newActualizedCalendarQuery,
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
      actualizedCalendarQuery,
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
        (candidate: RawEntryInfo) => candidate.localID === localID,
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
      actualizedCalendarQuery,
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
      actualizedCalendarQuery,
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
      actualizedCalendarQuery,
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
      actualizedCalendarQuery,
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
      actualizedCalendarQuery,
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
      actualizedCalendarQuery,
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
      actualizedCalendarQuery,
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
        actualizedCalendarQuery,
        lastUserInteractionCalendar,
        inconsistencyResponses,
      };
    }
  } else if (action.type === pingActionTypes.success) {
    const { payload } = action;

    let newInconsistencies = [], updatedEntryInfos, updatedDaysToEntries;
    if (payload.type === pingResponseTypes.FULL) {
      [ updatedEntryInfos, updatedDaysToEntries ] = mergeNewEntryInfos(
        entryInfos,
        payload.calendarResult.rawEntryInfos,
        newThreadInfos,
        {
          prevEntryInfos: payload.prevState.entryInfos,
          calendarQuery: payload.calendarResult.calendarQuery,
        },
      );
    } else {
      const { calendarQuery, updatesResult, deltaEntryInfos } = payload;
      const updateEntryInfos = mergeUpdateEntryInfos(
        deltaEntryInfos,
        updatesResult.newUpdates,
      );
      ({
        updatedEntryInfos,
        updatedDaysToEntries,
        newInconsistencies,
      } = handleCheckStateServerRequests(
        entryInfos,
        action,
        updateEntryInfos,
        newThreadInfos,
        payload.requests.serverRequests,
        calendarQuery,
      ));
    }

    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      actualizedCalendarQuery,
      lastUserInteractionCalendar,
      inconsistencyResponses: [
        ...inconsistencyResponses.filter(
          response =>
            !payload.requests.deliveredClientResponses.includes(response),
        ),
        ...newInconsistencies,
      ],
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
      actualizedCalendarQuery,
      lastUserInteractionCalendar,
      inconsistencyResponses,
    };
  } else if (action.type === rehydrateActionType) {
    if (!action.payload || !action.payload.entryStore) {
      return entryStore;
    }
    let highestLocalIDFound = -1;
    for (let entryKey in action.payload.entryStore.entryInfos) {
      const localID = action.payload.entryStore.entryInfos[entryKey].localID;
      if (localID) {
        const matches = localID.match(/^local([0-9]+)$/);
        invariant(
          matches && matches[1],
          `${localID} doesn't look like a localID`,
        );
        const thisLocalID = parseInt(matches[1]);
        if (thisLocalID > highestLocalIDFound) {
          highestLocalIDFound = thisLocalID;
        }
      }
    }
    setHighestLocalID(highestLocalIDFound + 1);
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
      actualizedCalendarQuery,
      lastUserInteractionCalendar,
      inconsistencyResponses: updatedResponses,
    };
  } else if (action.type === processServerRequestsActionType) {
    const {
      updatedEntryInfos,
      updatedDaysToEntries,
      newInconsistencies,
    } = handleCheckStateServerRequests(
      entryInfos,
      action,
      [],
      newThreadInfos,
      action.payload.serverRequests,
      actualizedCalendarQuery,
    );
    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      actualizedCalendarQuery,
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

type HandleCheckStateServerRequestsResult = {|
  updatedEntryInfos: {[id: string]: RawEntryInfo},
  updatedDaysToEntries: {[day: string]: string[]},
  newInconsistencies: EntryInconsistencyClientResponse[],
|};
function handleCheckStateServerRequests(
  beforeAction: {[id: string]: RawEntryInfo},
  action: BaseAction,
  baseEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  newThreadInfos: {[id: string]: RawThreadInfo},
  serverRequests: $ReadOnlyArray<ServerRequest>,
  calendarQuery: CalendarQuery,
): HandleCheckStateServerRequestsResult {
  const updateResult = mergeNewEntryInfos(
    beforeAction,
    baseEntryInfos,
    newThreadInfos,
  );

  const checkStateRequest = serverRequests.find(
    candidate => candidate.type === serverRequestTypes.CHECK_STATE,
  );
  if (
    !checkStateRequest ||
    !checkStateRequest.stateChanges ||
    !checkStateRequest.stateChanges.rawEntryInfos
  ) {
    return {
      updatedEntryInfos: updateResult[0],
      updatedDaysToEntries: updateResult[1],
      newInconsistencies: [],
    };
  }

  const { rawEntryInfos } = checkStateRequest.stateChanges;
  const [ updatedEntryInfos, updatedDaysToEntries ] = mergeNewEntryInfos(
    beforeAction,
    [ ...baseEntryInfos, ...rawEntryInfos ],
    newThreadInfos,
  );
  const newInconsistencies = findInconsistencies(
    beforeAction,
    action,
    updateResult[0],
    updatedEntryInfos,
    calendarQuery,
  );
  return { updatedEntryInfos, updatedDaysToEntries, newInconsistencies };
}

const emptyArray = [];
function findInconsistencies(
  beforeAction: {[id: string]: RawEntryInfo},
  action: BaseAction,
  oldResult: {[id: string]: RawEntryInfo},
  newResult: {[id: string]: RawEntryInfo},
  calendarQuery: CalendarQuery,
): EntryInconsistencyClientResponse[] {
  const filteredPollResult = filterRawEntryInfosByCalendarQuery(
    oldResult,
    calendarQuery,
  );
  const filteredPushResult = filterRawEntryInfosByCalendarQuery(
    newResult,
    calendarQuery,
  );
  if (_isEqual(filteredPollResult)(filteredPushResult)) {
    return emptyArray;
  }
  if (action.type === pingActionTypes.success) {
    if (action.payload.type === pingResponseTypes.FULL) {
      // We can get a memory leak if we include a previous
      // EntryInconsistencyClientResponse in this one
      action = {
        type: "PING_SUCCESS",
        loadingInfo: action.loadingInfo,
        payload: {
          ...action.payload,
          requests: {
            ...action.payload.requests,
            deliveredClientResponses: [],
          },
        },
      };
    } else {
      // This is a separate condition because of Flow
      action = {
        type: "PING_SUCCESS",
        loadingInfo: action.loadingInfo,
        payload: {
          ...action.payload,
          requests: {
            ...action.payload.requests,
            deliveredClientResponses: [],
          },
        },
      };
    }
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
