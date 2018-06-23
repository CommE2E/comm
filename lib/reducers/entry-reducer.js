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

import _flow from 'lodash/fp/flow';
import _map from 'lodash/fp/map';
import _pickBy from 'lodash/fp/pickBy';
import _omitBy from 'lodash/fp/omitBy';
import _mapValues from 'lodash/fp/mapValues';
import _filter from 'lodash/fp/filter';
import _union from 'lodash/fp/union';
import _mapKeys from 'lodash/fp/mapKeys';
import _groupBy from 'lodash/fp/groupBy';
import _without from 'lodash/fp/without';
import _isEqual from 'lodash/fp/isEqual';
import _isEmpty from 'lodash/fp/isEmpty';
import _values from 'lodash/fp/values';
import invariant from 'invariant';

import { dateString } from '../utils/date-utils';
import { setHighestLocalID } from '../utils/local-ids';
import { setCookieActionType } from '../utils/action-utils';
import {
  fetchEntriesActionTypes,
  fetchEntriesAndSetRangeActionTypes,
  createLocalEntryActionType,
  createEntryActionTypes,
  saveEntryActionTypes,
  concurrentModificationResetActionType,
  deleteEntryActionTypes,
  fetchRevisionsForEntryActionTypes,
  restoreEntryActionTypes,
  fetchEntriesAndAppendRangeActionTypes,
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
import { pingActionTypes } from '../actions/ping-actions';
import { rehydrateActionType } from '../types/redux-types';
import {
  entryID,
  rawEntryInfoWithinCalendarQuery,
} from '../shared/entry-utils';
import { threadInFilterList } from '../shared/thread-utils';

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
  oldDaysToEntries: {[id: string]: string[]},
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

  const daysToEntries = daysToEntriesFromEntryInfos(_values(mergedEntryInfos));
  return [mergedEntryInfos, daysToEntries];
}

function reduceEntryInfos(
  entryStore: EntryStore,
  action: BaseAction,
  newThreadInfos: {[id: string]: RawThreadInfo},
): EntryStore {
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
    if (Object.keys(newEntryInfos).length === Object.keys(entryInfos).length) {
      return {
        entryInfos,
        daysToEntries,
        lastUserInteractionCalendar: 0,
      };
    }
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    return {
      entryInfos: newEntryInfos,
      daysToEntries: newDaysToEntries,
      lastUserInteractionCalendar: 0,
    };
  } else if (action.type === setCookieActionType) {
    const authorizedThreadInfos = _pickBy(threadInFilterList)(newThreadInfos);
    const newEntryInfos = _pickBy(
      (entry: RawEntryInfo) => authorizedThreadInfos[entry.threadID],
    )(entryInfos);
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    const newLastUserInteractionCalendar = action.payload.cookieInvalidated
      ? 0
      : lastUserInteractionCalendar;
    if (Object.keys(newEntryInfos).length === Object.keys(entryInfos).length) {
      return {
        entryInfos,
        daysToEntries,
        lastUserInteractionCalendar: newLastUserInteractionCalendar,
      };
    }
    return {
      entryInfos: newEntryInfos,
      daysToEntries: newDaysToEntries,
      lastUserInteractionCalendar: newLastUserInteractionCalendar,
    };
  } else if (
    action.type === fetchEntriesAndSetRangeActionTypes.success ||
      action.type === fetchEntriesAndAppendRangeActionTypes.success
  ) {
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      action.payload.rawEntryInfos,
      newThreadInfos,
    );
    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      lastUserInteractionCalendar: Date.now(),
    };
  } else if (action.type === fetchEntriesActionTypes.success) {
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      action.payload.rawEntryInfos,
      newThreadInfos,
    );
    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      lastUserInteractionCalendar,
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
    };
  } else if (action.type === createEntryActionTypes.success) {
    const localID = action.payload.localID;
    const serverID = action.payload.entryID;
    // If an entry with this serverID already got into the store somehow
    // (likely through an unrelated request), we need to dedup them.
    let newEntryInfos;
    if (entryInfos[serverID]) {
      // It's fair to assume the serverID entry is newer than the localID
      // entry, and this probably won't happen often, so for now we can just
      // keep the serverID entry.
      newEntryInfos = _omitBy(
        (candidate: RawEntryInfo) => candidate.localID === localID,
      )(entryInfos);
    } else if (entryInfos[localID]) {
      newEntryInfos = _mapKeys(
        (oldKey: string) =>
          entryInfos[oldKey].localID === localID ? serverID : oldKey,
      )(entryInfos);
    } else {
      // This happens if the entry is deauthorized before it's saved
      return entryStore;
    }
    // Setting directly like this is okay because it's a new object anyways
    newEntryInfos[serverID] = {
      ...newEntryInfos[serverID],
      id: serverID,
      localID,
      text: action.payload.text,
    };
    const entryInfo = newEntryInfos[serverID];
    const dayString =
      dateString(entryInfo.year, entryInfo.month, entryInfo.day);
    const newDayEntryList = _flow(
      _without([localID]),
      _union([serverID]),
    )(daysToEntries[dayString]);
    const newDaysToEntries = {
      ...daysToEntries,
      [dayString]: newDayEntryList,
    };
    return {
      entryInfos: newEntryInfos,
      daysToEntries: newDaysToEntries,
      lastUserInteractionCalendar: Date.now(),
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
    const newEntryInfos = {
      ...entryInfos,
      [serverID]: {
        ...entryInfos[serverID],
        text: action.payload.text,
      },
    };
    return {
      entryInfos: newEntryInfos,
      daysToEntries,
      lastUserInteractionCalendar: Date.now(),
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
    };
  } else if (action.type === restoreEntryActionTypes.success) {
    const entryInfo = action.payload.entryInfo;
    const key = entryID(entryInfo);
    const newEntryInfos = {
      ...entryInfos,
      [key]: entryInfo,
    };
    return {
      entryInfos: newEntryInfos,
      daysToEntries,
      lastUserInteractionCalendar: Date.now(),
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
        daysToEntries,
        calendarResult.rawEntryInfos,
        newThreadInfos,
      );
      return {
        entryInfos: updatedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar,
      };
    }
  } else if (action.type === pingActionTypes.success) {
    const calendarResult = action.payload.calendarResult;
    let rawEntryInfos = calendarResult.rawEntryInfos;
    if (action.payload.updatesResult) {
      rawEntryInfos = mergeUpdateEntryInfos(
        rawEntryInfos,
        action.payload.updatesResult.newUpdates,
      );
    }
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      rawEntryInfos,
      newThreadInfos,
      {
        prevEntryInfos: action.payload.prevState.entryInfos,
        calendarQuery: action.payload.calendarResult.calendarQuery,
      },
    );
    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      lastUserInteractionCalendar,
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
    if (updateInfo.type !== updateTypes.JOIN_THREAD) {
      continue;
    }
    for (let entryInfo of updateInfo.rawEntryInfos) {
      if (entryIDs.has(entryInfo.id)) {
        continue;
      }
      mergedEntryInfos.push(entryInfo);
      entryIDs.add(entryInfo.id);
    }
  }
  return mergedEntryInfos;
}

export {
  daysToEntriesFromEntryInfos,
  reduceEntryInfos,
};
