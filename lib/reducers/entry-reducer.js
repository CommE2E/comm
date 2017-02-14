// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { EntryInfo } from '../types/entry-types';

import _ from 'lodash';
import invariant from 'invariant';

function daysToEntriesFromEntryInfos(entryInfos: EntryInfo[]) {
  return _.chain(entryInfos)
    .groupBy(
      (entryInfo: EntryInfo) =>
        `${entryInfo.day}/${entryInfo.month}/${entryInfo.year}`,
    ).mapValues((entryInfoGroup: EntryInfo[]) => _.map(entryInfoGroup, 'id'))
    .value();
}

function reduceEntryInfos<T: BaseAppState>(
  entryInfos: {[id: string]: EntryInfo},
  daysToEntries: {[id: string]: string[]},
  action: BaseAction<T>,
) {
  if (
    action.type === "LOG_OUT_SUCCESS" ||
      action.type === "DELETE_ACCOUNT_SUCCESS"
  ) {
    const calendarInfos = action.payload;
    const authorizedCalendarInfos = _.pickBy(calendarInfos, 'authorized');
    const newEntryInfos = _.pickBy(
      entryInfos,
      (entry: EntryInfo) => authorizedCalendarInfos[entry.calendarID],
    );
    const newDaysToEntries = _.mapValues(
      daysToEntries,
      (entryIDs: string[]) => _.filter(
        entryIDs,
        (entryID: string) => newEntryInfos[entryID],
      ),
    );
    return [newEntryInfos, newDaysToEntries];
  } else if (
    action.type === "FETCH_MONTH_ENTRIES_SUCCESS" ||
      action.type === "FETCH_ALL_DAY_ENTRIES_SUCCESS"
  ) {
    // Try to preserve localIDs. This is because we use them as React
    // keys and changing React keys leads to loss of component state.
    const addedEntryInfos = _.chain(action.payload)
      .map((entryInfo: EntryInfo) => {
        invariant(entryInfo.id, "new entryInfos should have serverID");
        const currentEntryInfo = entryInfos[entryInfo.id];
        if (currentEntryInfo && currentEntryInfo.localID) {
          // Setting directly like this is okay because it's a new object
          // anyways
          entryInfo.localID = currentEntryInfo.localID;
        }
        return entryInfo;
      }).keyBy('id')
      .value();
    const newEntryInfos = { ...entryInfos, ...addedEntryInfos };
    const addedDaysToEntries = daysToEntriesFromEntryInfos(action.payload);
    // This mutates addedDaysToEntries, but it's okay since it's a new object
    const newDaysToEntries = _.mergeWith(
      addedDaysToEntries,
      daysToEntries,
      (addedEntryIDs, originalEntryIDs) => _.isArray(addedEntryIDs)
        ? _.union(originalEntryIDs, addedEntryIDs)
        : undefined,
    );
    return [newEntryInfos, newDaysToEntries];
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
      [dayString]: _.union(daysToEntries[dayString], [entryInfo.localID]),
    };
    return [newEntryInfos, newDaysToEntries];
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
        newEntryInfos = _.omitBy(
          entryInfos,
          (candidate: EntryInfo) => candidate.localID === localID,
        );
      } else if (entryInfos[localID]) {
        newEntryInfos = _.mapKeys(
          entryInfos,
          (entryInfo: EntryInfo, oldKey: string) =>
            entryInfo.localID === localID ? serverID : oldKey,
        );
      } else {
        // This happens if the entry is deauthorized before it's saved
        return [entryInfos, daysToEntries];
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
      const newDayEntryList = _.chain(daysToEntries[dayString])
        .without(localID)
        .union([serverID])
        .value();
      const newDaysToEntries = {
        ...daysToEntries,
        [dayString]: newDayEntryList,
      };
      return [newEntryInfos, newDaysToEntries];
    } else if (entryInfos[serverID]) {
      const newEntryInfos = {
        ...entryInfos,
        [serverID]: {
          ...entryInfos[serverID],
          text: action.payload.text,
        },
      };
      return [newEntryInfos, daysToEntries];
    } else {
      // This happens if the entry is deauthorized before it's saved
      return [entryInfos, daysToEntries];
    }
  } else if (action.type === "CONCURRENT_MODIFICATION_RESET") {
    const payload = action.payload;
    if (!entryInfos[payload.id]) {
      // This happens if the entry is deauthorized before it's restored
      return [entryInfos, daysToEntries];
    }
    const newEntryInfos = {
      ...entryInfos,
      [payload.id]: {
        ...entryInfos[payload.id],
        text: payload.dbText,
      },
    };
    return [newEntryInfos, daysToEntries];
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
    return [newEntryInfos, daysToEntries];
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
    return [newEntryInfos, daysToEntries];
  } else if (action.type === "RESTORE_ENTRY_SUCCESS") {
    const newEntryInfos = {
      ...entryInfos,
      [action.payload]: {
        ...entryInfos[action.payload],
        deleted: false,
      },
    };
    return [newEntryInfos, daysToEntries];
  }
  return [entryInfos, daysToEntries];
}

export {
  daysToEntriesFromEntryInfos,
  reduceEntryInfos,
};
