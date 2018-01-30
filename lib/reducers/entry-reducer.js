// @flow

import type { BaseAction } from '../types/redux-types';
import type { RawEntryInfo, EntryStore } from '../types/entry-types';
import { threadPermissions } from '../types/thread-types';

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
import _isEqual from 'lodash/fp/isEqual';
import _compact from 'lodash/fp/compact';
import _isEmpty from 'lodash/fp/isEmpty';
import invariant from 'invariant';

import { dateString } from '../utils/date-utils';
import { setHighestLocalID } from '../utils/local-ids';
import { setCookieActionType } from '../utils/action-utils';
import {
  fetchEntriesActionTypes,
  fetchEntriesAndSetRangeActionTypes,
  createLocalEntryActionType,
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
import { deleteThreadActionTypes } from '../actions/thread-actions';
import { pingActionTypes } from '../actions/ping-actions';
import { rehydrateActionType } from '../types/redux-types';

function daysToEntriesFromEntryInfos(entryInfos: RawEntryInfo[]) {
  return _flow(
    _groupBy(
      (entryInfo: RawEntryInfo) =>
        dateString(entryInfo.year, entryInfo.month, entryInfo.day),
    ),
    _mapValues((entryInfoGroup: RawEntryInfo[]) => _map('id')(entryInfoGroup)),
  )(entryInfos);
}

function filterExistingDaysToEntriesWithNewEntryInfos(
  oldDaysToEntries: {[id: string]: string[]},
  newEntryInfos: {[id: string]: RawEntryInfo},
) {
  return _mapValues(
    (entryIDs: string[]) => _filter(
      (entryID: string) => newEntryInfos[entryID],
    )(entryIDs),
  )(oldDaysToEntries);
}

function mergeNewEntryInfos(
  oldEntryInfos: {[id: string]: RawEntryInfo},
  oldDaysToEntries: {[id: string]: string[]},
  newEntryInfos: RawEntryInfo[],
) {
  const addedEntryInfos = _flow(
    _map((entryInfo: RawEntryInfo) => {
      invariant(entryInfo.id, "new entryInfos should have serverID");
      const currentEntryInfo = oldEntryInfos[entryInfo.id];
      if (currentEntryInfo && currentEntryInfo.localID) {
        // Try to preserve localIDs. This is because we use them as React
        // keys and changing React keys leads to loss of component state.
        entryInfo = {
          id: entryInfo.id,
          localID: currentEntryInfo.localID,
          threadID: entryInfo.threadID,
          text: entryInfo.text,
          year: entryInfo.year,
          month: entryInfo.month,
          day: entryInfo.day,
          creationTime: entryInfo.creationTime,
          creatorID: entryInfo.creatorID,
          deleted: entryInfo.deleted,
        };
      }
      if (_isEqual(entryInfo)(currentEntryInfo)) {
        return null;
      } else {
        return entryInfo;
      }
    }),
    _compact,
    _keyBy('id'),
  )(newEntryInfos);
  if (_isEmpty(addedEntryInfos)) {
    return [oldEntryInfos, oldDaysToEntries];
  }
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
  entryStore: EntryStore,
  action: BaseAction,
): EntryStore {
  const entryInfos = entryStore.entryInfos;
  const daysToEntries = entryStore.daysToEntries;
  const lastUserInteractionCalendar = entryStore.lastUserInteractionCalendar;
  if (
    action.type === logOutActionTypes.success ||
      action.type === deleteAccountActionTypes.success
  ) {
    const threadInfos = action.payload.threadInfos;
    const authorizedThreadInfos = _pickBy(
      `currentUser.permissions.${threadPermissions.VISIBLE}`,
    )(threadInfos);
    const newEntryInfos = _pickBy(
      (entry: RawEntryInfo) => authorizedThreadInfos[entry.threadID],
    )(entryInfos);
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    return {
      entryInfos: newEntryInfos,
      daysToEntries: newDaysToEntries,
      lastUserInteractionCalendar: 0,
    };
  } else if (action.type === deleteThreadActionTypes.success) {
    const threadID = action.payload;
    const newEntryInfos = _omitBy(
      (entry: RawEntryInfo) => entry.threadID === threadID,
    )(entryInfos);
    const newDaysToEntries = filterExistingDaysToEntriesWithNewEntryInfos(
      daysToEntries,
      newEntryInfos,
    );
    return {
      entryInfos: newEntryInfos,
      daysToEntries: newDaysToEntries,
      lastUserInteractionCalendar: Date.now(),
    };
  } else if (action.type === setCookieActionType) {
    const threadInfos = action.payload.threadInfos;
    const authorizedThreadInfos = _pickBy(
      `currentUser.permissions.${threadPermissions.VISIBLE}`,
    )(threadInfos);
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
      action.payload.entryInfos,
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
      action.payload.entryInfos,
    );
    return {
      entryInfos: updatedEntryInfos,
      daysToEntries: updatedDaysToEntries,
      lastUserInteractionCalendar,
    };
  } else if (action.type === createLocalEntryActionType) {
    const entryInfo = action.payload;
    invariant(entryInfo.localID, "localID should be set in CREATE_LOCAL_ENTRY");
    const newEntryInfos = {
      ...entryInfos,
      [entryInfo.localID]: entryInfo,
    };
    const dayString =
      dateString(entryInfo.year, entryInfo.month, entryInfo.day);
    const newDaysToEntries = {
      ...daysToEntries,
      [dayString]: _union([entryInfo.localID])(daysToEntries[dayString]),
    };
    return {
      entryInfos: newEntryInfos,
      daysToEntries: newDaysToEntries,
      lastUserInteractionCalendar: Date.now(),
    };
  } else if (action.type === saveEntryActionTypes.success) {
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
    } else if (entryInfos[serverID]) {
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
    } else {
      // This happens if the entry is deauthorized before it's saved
      return entryStore;
    }
  } else if (action.type === concurrentModificationResetActionType) {
    const payload = action.payload;
    if (!entryInfos[payload.id]) {
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
    // Make sure the entry is in sync with its latest revision
    const newEntryInfos = {
      ...entryInfos,
      [action.payload.entryID]: {
        ...entryInfos[action.payload.entryID],
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
    const newEntryInfos = {
      ...entryInfos,
      [action.payload]: {
        ...entryInfos[action.payload],
        deleted: false,
      },
    };
    return {
      entryInfos: newEntryInfos,
      daysToEntries,
      lastUserInteractionCalendar: Date.now(),
    };
  } else if (
    action.type === logInActionTypes.success ||
      action.type === resetPasswordActionTypes.success ||
      action.type === pingActionTypes.success
  ) {
    const calendarResult = action.payload.calendarResult;
    if (calendarResult) {
      const [updatedEntryInfos, updatedDaysToEntries] = mergeNewEntryInfos(
        entryInfos,
        daysToEntries,
        calendarResult.entryInfos,
      );
      return {
        entryInfos: updatedEntryInfos,
        daysToEntries: updatedDaysToEntries,
        lastUserInteractionCalendar,
      };
    }
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

export {
  daysToEntriesFromEntryInfos,
  reduceEntryInfos,
};
