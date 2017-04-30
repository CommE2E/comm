// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { EntryInfo } from '../types/entry-types';

import _flow from 'lodash/fp/flow';
import _map from 'lodash/fp/map';
import _pickBy from 'lodash/fp/pickBy';
import _omitBy from 'lodash/fp/omitBy';
import _mapValues from 'lodash/fp/mapValues';
import _filter from 'lodash/fp/filter';
import _mergeWith from 'lodash/fp/mergeWith';
import _isArray from 'lodash/fp/isArray';
import _union from 'lodash/fp/union';
import _mapKeys from 'lodash/fp/mapKeys';
import _groupBy from 'lodash/fp/groupBy';
import _keyBy from 'lodash/fp/keyBy';
import _without from 'lodash/fp/without';
import invariant from 'invariant';

import { padMonthOrDay } from '../utils/date-utils';

function daysToEntriesFromEntryInfos(entryInfos: EntryInfo[]) {
  return _flow(
    _groupBy(
      (entryInfo: EntryInfo) =>
        `${entryInfo.year}-${padMonthOrDay(entryInfo.month)}-` +
          padMonthOrDay(entryInfo.day),
    ),
    _mapValues((entryInfoGroup: EntryInfo[]) => _map('id')(entryInfoGroup)),
  )(entryInfos);
}

function filterExistingDaysToEntriesWithNewEntryInfos(
  oldDaysToEntries: {[id: string]: string[]},
  newEntryInfos: {[id: string]: EntryInfo},
) {
  return _mapValues(
    (entryIDs: string[]) => _filter(
      (entryID: string) => newEntryInfos[entryID],
    )(entryIDs),
  )(oldDaysToEntries);
}

function mergeNewEntryInfos(
  oldEntryInfos: {[id: string]: EntryInfo},
  oldDaysToEntries: {[id: string]: string[]},
  newEntryInfos: EntryInfo[],
) {
  // Try to preserve localIDs. This is because we use them as React
  // keys and changing React keys leads to loss of component state.
  const addedEntryInfos = _flow(
    _map((entryInfo: EntryInfo) => {
      invariant(entryInfo.id, "new entryInfos should have serverID");
      const currentEntryInfo = oldEntryInfos[entryInfo.id];
      if (currentEntryInfo && currentEntryInfo.localID) {
        // Setting directly like this is okay because it's a new object
        // anyways
        entryInfo.localID = currentEntryInfo.localID;
      }
      return entryInfo;
    }),
    _keyBy('id'),
  )(newEntryInfos);
  const mergedEntryInfos = { ...oldEntryInfos, ...addedEntryInfos };
  const addedDaysToEntries = daysToEntriesFromEntryInfos(mergedEntryInfos);
  // This mutates addedDaysToEntries, but it's okay since it's a new object
  const mergedDaysToEntries = _mergeWith(
    (addedEntryIDs, originalEntryIDs) => _isArray(addedEntryIDs)
      ? _union(addedEntryIDs)(originalEntryIDs)
      : undefined,
  )(addedDaysToEntries)(oldDaysToEntries);
  return [mergedEntryInfos, mergedDaysToEntries];
}

function reduceEntryInfos(
  inputEntryInfos: {[id: string]: EntryInfo},
  inputDaysToEntries: {[id: string]: string[]},
  inputEntriesWithinRangeLastUpdated: number,
  action: BaseAction,
) {
  const entryInfos = inputEntryInfos;
  const daysToEntries = inputDaysToEntries;
  const entriesWithinRangeLastUpdated = inputEntriesWithinRangeLastUpdated;
  if (
    action.type === "LOG_OUT_SUCCESS" ||
      action.type === "DELETE_ACCOUNT_SUCCESS"
  ) {
    const calendarInfos = action.payload;
    const authorizedCalendarInfos = _pickBy('authorized')(calendarInfos);
    const newEntryInfos = _pickBy(
      (entry: EntryInfo) => authorizedCalendarInfos[entry.calendarID],
    )(entryInfos);
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    return [newEntryInfos, newDaysToEntries, 0];
  } else if (action.type === "DELETE_CALENDAR_SUCCESS") {
    const calendarID = action.payload;
    const newEntryInfos = _omitBy(
      (entry: EntryInfo) => entry.calendarID === calendarID,
    )(entryInfos);
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    return [newEntryInfos, newDaysToEntries, entriesWithinRangeLastUpdated];
  } else if (action.type === "SET_COOKIE" && action.payload.calendarInfos) {
    const calendarInfos = action.payload.calendarInfos;
    const authorizedCalendarInfos = _pickBy('authorized')(calendarInfos);
    const newEntryInfos = _pickBy(
      (entry: EntryInfo) => authorizedCalendarInfos[entry.calendarID],
    )(entryInfos);
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    return [newEntryInfos, newDaysToEntries, entriesWithinRangeLastUpdated];
  } else if (action.type === "FETCH_ENTRIES_AND_SET_RANGE_SUCCESS") {
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      action.payload.entryInfos,
    );
    return [updatedEntryInfos, updatedDaysToEntries, Date.now()];
  } else if (action.type === "FETCH_ALL_DAY_ENTRIES_SUCCESS") {
    const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
      entryInfos,
      daysToEntries,
      action.payload,
    );
    return [
      updatedEntryInfos,
      updatedDaysToEntries,
      entriesWithinRangeLastUpdated,
    ];
  } else if (action.type === "CREATE_LOCAL_ENTRY") {
    const entryInfo = action.payload;
    invariant(entryInfo.localID, "localID should be set in CREATE_LOCAL_ENTRY");
    const newEntryInfos = {
      ...entryInfos,
      [entryInfo.localID]: entryInfo,
    };
    const dayString = `${entryInfo.day}/${entryInfo.month}/${entryInfo.year}`;
    const newDaysToEntries = {
      ...daysToEntries,
      [dayString]: _union([entryInfo.localID])(daysToEntries[dayString]),
    };
    return [newEntryInfos, newDaysToEntries, entriesWithinRangeLastUpdated];
  } else if (action.type === "SAVE_ENTRY_SUCCESS") {
    const serverID = action.payload.serverID;
    if (action.payload.localID) {
      const localID = action.payload.localID;
      // If an entry with this serverID already got into the store somehow
      // (likely through an unrelated request), we need to dedup them.
      let newEntryInfos;
      if (entryInfos[serverID]) {
        // It's fair to assume the serverID entry is newer than the localID
        // entry, and this probably won't happen often, so for now we can just
        // keep the serverID entry.
        newEntryInfos = _omitBy(
          (candidate: EntryInfo) => candidate.localID === localID,
        )(entryInfos);
      } else if (entryInfos[localID]) {
        newEntryInfos = _mapKeys(
          (oldKey: string) =>
            entryInfos[oldKey].localID === localID ? serverID : oldKey,
        )(entryInfos);
      } else {
        // This happens if the entry is deauthorized before it's saved
        return [entryInfos, daysToEntries, entriesWithinRangeLastUpdated];
      }
      // Setting directly like this is okay because it's a new object anyways
      newEntryInfos[serverID] = {
        ...newEntryInfos[serverID],
        id: serverID,
        localID,
        text: action.payload.text,
      };
      const entryInfo = newEntryInfos[serverID];
      const dayString = `${entryInfo.day}/${entryInfo.month}/${entryInfo.year}`;
      const newDayEntryList = _flow(
        _without([localID]),
        _union([serverID]),
      )(daysToEntries[dayString]);
      const newDaysToEntries = {
        ...daysToEntries,
        [dayString]: newDayEntryList,
      };
      return [newEntryInfos, newDaysToEntries, Date.now()];
    } else if (entryInfos[serverID]) {
      const newEntryInfos = {
        ...entryInfos,
        [serverID]: {
          ...entryInfos[serverID],
          text: action.payload.text,
        },
      };
      return [newEntryInfos, daysToEntries, Date.now()];
    } else {
      // This happens if the entry is deauthorized before it's saved
      return [entryInfos, daysToEntries, entriesWithinRangeLastUpdated];
    }
  } else if (action.type === "CONCURRENT_MODIFICATION_RESET") {
    const payload = action.payload;
    if (!entryInfos[payload.id]) {
      // This happens if the entry is deauthorized before it's restored
      return [entryInfos, daysToEntries, entriesWithinRangeLastUpdated];
    }
    const newEntryInfos = {
      ...entryInfos,
      [payload.id]: {
        ...entryInfos[payload.id],
        text: payload.dbText,
      },
    };
    return [newEntryInfos, daysToEntries, entriesWithinRangeLastUpdated];
  } else if (action.type === "DELETE_ENTRY_STARTED") {
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
    return [newEntryInfos, daysToEntries, entriesWithinRangeLastUpdated];
  } else if (action.type === "FETCH_REVISIONS_FOR_ENTRY_SUCCESS") {
    // Make sure the entry is in sync with its latest revision
    const newEntryInfos = {
      ...entryInfos,
      [action.payload.entryID]: {
        ...entryInfos[action.payload.entryID],
        text: action.payload.text,
        deleted: action.payload.deleted,
      },
    };
    return [newEntryInfos, daysToEntries, entriesWithinRangeLastUpdated];
  } else if (action.type === "RESTORE_ENTRY_SUCCESS") {
    const newEntryInfos = {
      ...entryInfos,
      [action.payload]: {
        ...entryInfos[action.payload],
        deleted: false,
      },
    };
    return [newEntryInfos, daysToEntries, entriesWithinRangeLastUpdated];
  } else if (
    action.type === "LOG_IN_SUCCESS" ||
      action.type === "RESET_PASSWORD_SUCCESS" ||
      action.type === "PING_SUCCESS"
  ) {
    const entriesResult = action.payload.entriesResult;
    if (entriesResult) {
      const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
        entryInfos,
        daysToEntries,
        entriesResult.entryInfos,
      );
      return [
        updatedEntryInfos,
        updatedDaysToEntries,
        // Pings explicitly shouldn't update entriesWithinRangeLastUpdated,
        // since that field is what's preventing us from reseting the range
        // back to something more constrained, and pings happen all the time.
        action.type === "PING_SUCCESS"
          ? entriesWithinRangeLastUpdated
          : Date.now(),
      ];
    }
  }
  return [entryInfos, daysToEntries, entriesWithinRangeLastUpdated];
}

export {
  daysToEntriesFromEntryInfos,
  reduceEntryInfos,
};
