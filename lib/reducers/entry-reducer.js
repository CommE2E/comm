// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { EntryInfo } from '../types/entry-types';

import _ from 'lodash';
import invariant from 'invariant';

export default function reduceEntryInfos<T: BaseAppState>(
  state: {[day: string]: {[id: string]: EntryInfo}},
  action: BaseAction<T>,
) {
  if (
    action.type === "LOG_OUT_SUCCESS" ||
      action.type === "DELETE_ACCOUNT_SUCCESS"
  ) {
    const calendarInfos = action.payload;
    const authorizedCalendarInfos = _.pickBy(calendarInfos, 'authorized');
    return _.mapValues(
      state,
      (entries: {[id: string]: EntryInfo}) => _.pickBy(
        entries,
        (entry: EntryInfo) => authorizedCalendarInfos[entry.calendarID],
      ),
    );
  } else if (
    action.type === "FETCH_MONTH_ENTRIES_SUCCESS" ||
      action.type === "FETCH_ALL_DAY_ENTRIES_SUCCESS"
  ) {
    const newEntries = _.chain(action.payload)
      .groupBy((entryInfo) => entryInfo.day)
      .mapValues(
        (entryInfoGroup, day) => _.chain(entryInfoGroup)
          .keyBy('id')
          .mapValues((result) => {
            // Try to preserve localIDs. This is because we use them as React
            // keys and we would prefer not to have to change those.
            const currentEntryInfo = state[day][result.id];
            if (currentEntryInfo && currentEntryInfo.localID) {
              result.localID = currentEntryInfo.localID;
            }
            return result;
          })
          .value(),
      ).value();
    return {
      ...state,
      ...newEntries,
    };
  } else if (action.type === "CREATE_LOCAL_ENTRY") {
    const dayString = action.payload.day.toString();
    invariant(
      action.payload.localID,
      "localID should be set in CREATE_LOCAL_ENTRY",
    );
    return {
      ...state,
      [dayString]: {
        ...state[dayString],
        [action.payload.localID]: action.payload,
      },
    };
  } else if (action.type === "SAVE_ENTRY_SUCCESS") {
    const serverID = action.payload.serverID;
    const dayString = action.payload.day.toString();
    const dayEntryInfos = state[dayString];
    let newDayEntryInfos;
    if (action.payload.localID) {
      const localID = action.payload.localID;
      // If an entry with this serverID already got into the store somehow
      // (likely through an unrelated request), we need to dedup them.
      if (dayEntryInfos[serverID]) {
        // It's fair to assume the serverID entry is newer than the localID
        // entry, and this probably won't happen often, so for now we can just
        // keep the serverID entry.
        newDayEntryInfos = _.omitBy(
          dayEntryInfos,
          (candidate) => candidate.localID === localID,
        );
      } else if (dayEntryInfos[localID]) {
        newDayEntryInfos = _.mapKeys(
          dayEntryInfos,
          (entryInfo, oldKey) => entryInfo.localID === localID
            ? serverID
            : oldKey,
        );
      } else {
        // This happens if the entry is deleted before it's saved
        return state;
      }
      newDayEntryInfos[serverID] = {
        ...newDayEntryInfos[serverID],
        id: serverID,
        localID,
        text: action.payload.text,
      };
    } else if (dayEntryInfos[serverID]) {
      newDayEntryInfos = {
        ...dayEntryInfos,
        [serverID]: {
          ...dayEntryInfos[serverID],
          text: action.payload.text,
        },
      };
    } else {
      // This happens if the entry is deleted before it's saved
      return state;
    }
    return {
      ...state,
      [dayString]: newDayEntryInfos,
    };
  } else if (action.type === "CONCURRENT_MODIFICATION_RESET") {
    const dayString = action.payload.day.toString();
    if (!state[dayString][action.payload.serverID]) {
      // This happens if the entry is deleted before it's restored
      return state;
    }
    return {
      ...state,
      [dayString]: {
        ...state[dayString],
        [action.payload.serverID]: {
          ...state[dayString][action.payload.serverID],
          text: action.payload.dbText,
        },
      },
    };
  } else if (action.type === "DELETE_ENTRY_STARTED") {
    const payload = action.payload;
    const dayString = payload.day.toString();
    const dayEntryInfos = state[dayString];
    const id = payload.serverID && dayEntryInfos[payload.serverID]
      ? payload.serverID
      : payload.localID;
    invariant(id, 'either serverID or localID should be set');
    return {
      ...state,
      [dayString]: {
        ...dayEntryInfos,
        [id]: {
          ...dayEntryInfos[id],
          deleted: true,
        },
      },
    };
  } else if (action.type === "FETCH_REVISIONS_FOR_ENTRY_SUCCESS") {
    const dayString = action.payload.day.toString();
    return {
      ...state,
      [dayString]: {
        ...state[dayString],
        [action.payload.entryID]: {
          ...state[dayString][action.payload.entryID],
          text: action.payload.text,
          deleted: action.payload.deleted,
        },
      },
    };
  } else if (action.type === "RESTORE_ENTRY_SUCCESS") {
    const payload = action.payload;
    const dayString = payload.day.toString();
    invariant(payload.id, "entry's id (serverID) should be set");
    return {
      ...state,
      [dayString]: {
        ...state[dayString],
        [payload.id]: payload,
      },
    };
  }
  return state;
}
