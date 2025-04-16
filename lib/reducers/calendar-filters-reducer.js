// @flow

import {
  updateCalendarCommunityFilter,
  clearCalendarCommunityFilter,
} from '../actions/community-actions.js';
import {
  newThreadActionTypes,
  joinThreadActionTypes,
  leaveThreadActionTypes,
  deleteThreadActionTypes,
} from '../actions/thread-actions.js';
import { fetchPendingUpdatesActionTypes } from '../actions/update-actions.js';
import {
  keyserverAuthActionTypes,
  deleteKeyserverAccountActionTypes,
  legacyLogInActionTypes,
} from '../actions/user-actions.js';
import { extractKeyserverIDFromIDOptional } from '../keyserver-conn/keyserver-call-utils.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import {
  filteredThreadIDs,
  nonThreadCalendarFilters,
  nonExcludeDeletedCalendarFilters,
} from '../selectors/calendar-filter-selectors.js';
import { threadInFilterList } from '../shared/thread-utils.js';
import { updateSpecs } from '../shared/updates/update-specs.js';
import { processDMOpsActionType } from '../types/dm-ops.js';
import {
  type CalendarFilter,
  defaultCalendarFilters,
  updateCalendarThreadFilter,
  clearCalendarThreadFilter,
  setCalendarDeletedFilter,
  calendarThreadFilterTypes,
} from '../types/filter-types.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
  stateSyncPayloadTypes,
} from '../types/socket-types.js';
import type { RawThreadInfos, ThreadStore } from '../types/thread-types.js';
import {
  type ClientUpdateInfo,
  processUpdatesActionType,
} from '../types/update-types.js';
import { filterThreadIDsBelongingToCommunity } from '../utils/drawer-utils.react.js';

export default function reduceCalendarFilters(
  state: $ReadOnlyArray<CalendarFilter>,
  action: BaseAction,
  threadStore: ThreadStore,
): $ReadOnlyArray<CalendarFilter> {
  if (action.type === legacyLogInActionTypes.success) {
    return defaultCalendarFilters;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated
  ) {
    return removeKeyserverThreadIDsFromFilterList(state, [
      action.payload.keyserverID,
    ]);
  } else if (action.type === deleteKeyserverAccountActionTypes.success) {
    return removeKeyserverThreadIDsFromFilterList(
      state,
      action.payload.keyserverIDs,
    );
  } else if (action.type === keyserverAuthActionTypes.success) {
    const keyserverIDs = Object.keys(action.payload.updatesCurrentAsOf);
    return removeKeyserverThreadIDsFromFilterList(state, keyserverIDs);
  } else if (action.type === updateCalendarThreadFilter) {
    const nonThreadFilters = nonThreadCalendarFilters(state);
    return [
      ...nonThreadFilters,
      {
        type: calendarThreadFilterTypes.THREAD_LIST,
        threadIDs: action.payload.threadIDs,
      },
    ];
  } else if (action.type === clearCalendarThreadFilter) {
    return nonThreadCalendarFilters(state);
  } else if (action.type === setCalendarDeletedFilter) {
    const otherFilters = nonExcludeDeletedCalendarFilters(state);
    if (action.payload.includeDeleted && otherFilters.length === state.length) {
      // Attempting to remove NOT_DELETED filter, but it doesn't exist
      return state;
    } else if (action.payload.includeDeleted) {
      // Removing NOT_DELETED filter
      return otherFilters;
    } else if (otherFilters.length < state.length) {
      // Attempting to add NOT_DELETED filter, but it already exists
      return state;
    } else {
      // Adding NOT_DELETED filter
      return [...state, { type: calendarThreadFilterTypes.NOT_DELETED }];
    }
  } else if (
    action.type === newThreadActionTypes.success ||
    action.type === joinThreadActionTypes.success ||
    action.type === leaveThreadActionTypes.success ||
    action.type === deleteThreadActionTypes.success ||
    action.type === processUpdatesActionType
  ) {
    return updateFilterListFromUpdateInfos(
      state,
      action.payload.updatesResult.newUpdates,
    );
  } else if (action.type === incrementalStateSyncActionType) {
    return updateFilterListFromUpdateInfos(
      state,
      action.payload.updatesResult.newUpdates,
    );
  } else if (
    action.type === fetchPendingUpdatesActionTypes.success &&
    action.payload.type === stateSyncPayloadTypes.INCREMENTAL
  ) {
    return updateFilterListFromUpdateInfos(
      state,
      action.payload.updatesResult.newUpdates,
    );
  } else if (action.type === fullStateSyncActionType) {
    return removeDeletedThreadIDsFromFilterList(
      state,
      action.payload.threadInfos,
    );
  } else if (
    action.type === fetchPendingUpdatesActionTypes.success &&
    action.payload.type === stateSyncPayloadTypes.FULL
  ) {
    return removeDeletedThreadIDsFromFilterList(
      state,
      action.payload.threadInfos,
    );
  } else if (action.type === updateCalendarCommunityFilter) {
    const nonThreadFilters = nonThreadCalendarFilters(state);

    const threadIDs = Array.from(
      filterThreadIDsBelongingToCommunity(
        action.payload,
        threadStore.threadInfos,
      ),
    );
    return [
      ...nonThreadFilters,
      {
        type: calendarThreadFilterTypes.THREAD_LIST,
        threadIDs,
      },
    ];
  } else if (action.type === clearCalendarCommunityFilter) {
    const nonThreadFilters = nonThreadCalendarFilters(state);
    return nonThreadFilters;
  } else if (action.type === processDMOpsActionType) {
    return updateFilterListFromUpdateInfos(state, action.payload.updateInfos);
  }
  return state;
}

function updateFilterListFromUpdateInfos(
  state: $ReadOnlyArray<CalendarFilter>,
  updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
): $ReadOnlyArray<CalendarFilter> {
  const currentlyFilteredIDs: ?$ReadOnlySet<string> = filteredThreadIDs(state);
  if (!currentlyFilteredIDs) {
    return state;
  }
  const newFilteredThreadIDs = updateInfos.reduce(
    (reducedFilteredThreadIDs, update) => {
      const { reduceCalendarThreadFilters } = updateSpecs[update.type];
      return reduceCalendarThreadFilters
        ? reduceCalendarThreadFilters(reducedFilteredThreadIDs, update)
        : reducedFilteredThreadIDs;
    },
    currentlyFilteredIDs,
  );
  if (currentlyFilteredIDs !== newFilteredThreadIDs) {
    return [
      ...nonThreadCalendarFilters(state),
      { type: 'threads', threadIDs: [...newFilteredThreadIDs] },
    ];
  }
  return state;
}

function filterThreadIDsInFilterList(
  state: $ReadOnlyArray<CalendarFilter>,
  filterCondition: (threadID: string) => boolean,
): $ReadOnlyArray<CalendarFilter> {
  const currentlyFilteredIDs = filteredThreadIDs(state);
  if (!currentlyFilteredIDs) {
    return state;
  }
  const filtered = [...currentlyFilteredIDs].filter(filterCondition);

  if (filtered.length < currentlyFilteredIDs.size) {
    return [
      ...nonThreadCalendarFilters(state),
      { type: 'threads', threadIDs: filtered },
    ];
  }
  return state;
}

function removeDeletedThreadIDsFromFilterList(
  state: $ReadOnlyArray<CalendarFilter>,
  threadInfos: RawThreadInfos,
): $ReadOnlyArray<CalendarFilter> {
  const filterCondition = (threadID: string) =>
    threadInFilterList(threadInfos[threadID]);

  return filterThreadIDsInFilterList(state, filterCondition);
}

function removeKeyserverThreadIDsFromFilterList(
  state: $ReadOnlyArray<CalendarFilter>,
  keyserverIDs: $ReadOnlyArray<string>,
): $ReadOnlyArray<CalendarFilter> {
  const keyserverIDsSet = new Set<string>(keyserverIDs);
  const filterCondition = (threadID: string) => {
    const keyserverID = extractKeyserverIDFromIDOptional(threadID);
    return !keyserverID || !keyserverIDsSet.has(keyserverID);
  };

  return filterThreadIDsInFilterList(state, filterCondition);
}

export {
  filterThreadIDsInFilterList,
  removeDeletedThreadIDsFromFilterList,
  removeKeyserverThreadIDsFromFilterList,
};
