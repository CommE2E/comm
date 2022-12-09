// @flow

import {
  newThreadActionTypes,
  joinThreadActionTypes,
  leaveThreadActionTypes,
  deleteThreadActionTypes,
} from '../actions/thread-actions';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions';
import {
  filteredThreadIDs,
  nonThreadCalendarFilters,
  nonExcludeDeletedCalendarFilters,
} from '../selectors/calendar-filter-selectors';
import { threadInFilterList } from '../shared/thread-utils';
import {
  type CalendarFilter,
  defaultCalendarFilters,
  updateCalendarThreadFilter,
  clearCalendarThreadFilter,
  setCalendarDeletedFilter,
  calendarThreadFilterTypes,
} from '../types/filter-types';
import type { BaseAction } from '../types/redux-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';
import type { RawThreadInfo } from '../types/thread-types';
import {
  updateTypes,
  type ClientUpdateInfo,
  processUpdatesActionType,
} from '../types/update-types';
import {
  setNewSessionActionType,
  isSuccessfulAuthType,
} from '../utils/action-utils';

export default function reduceCalendarFilters(
  state: $ReadOnlyArray<CalendarFilter>,
  action: BaseAction,
): $ReadOnlyArray<CalendarFilter> {
  if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    isSuccessfulAuthType(action) ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return defaultCalendarFilters;
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
  } else if (action.type === fullStateSyncActionType) {
    return removeDeletedThreadIDsFromFilterList(
      state,
      action.payload.threadInfos,
    );
  }
  return state;
}

function updateFilterListFromUpdateInfos(
  state: $ReadOnlyArray<CalendarFilter>,
  updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
): $ReadOnlyArray<CalendarFilter> {
  const currentlyFilteredIDs = filteredThreadIDs(state);
  if (!currentlyFilteredIDs) {
    return state;
  }
  let changeOccurred = false;
  for (const update of updateInfos) {
    if (update.type === updateTypes.DELETE_THREAD) {
      const result = currentlyFilteredIDs.delete(update.threadID);
      if (result) {
        changeOccurred = true;
      }
    } else if (update.type === updateTypes.JOIN_THREAD) {
      if (
        !threadInFilterList(update.threadInfo) ||
        currentlyFilteredIDs.has(update.threadInfo.id)
      ) {
        continue;
      }
      currentlyFilteredIDs.add(update.threadInfo.id);
      changeOccurred = true;
    } else if (update.type === updateTypes.UPDATE_THREAD) {
      if (threadInFilterList(update.threadInfo)) {
        continue;
      }
      const result = currentlyFilteredIDs.delete(update.threadInfo.id);
      if (result) {
        changeOccurred = true;
      }
    }
  }
  if (changeOccurred) {
    return [
      ...nonThreadCalendarFilters(state),
      { type: 'threads', threadIDs: [...currentlyFilteredIDs] },
    ];
  }
  return state;
}

function removeDeletedThreadIDsFromFilterList(
  state: $ReadOnlyArray<CalendarFilter>,
  threadInfos: { +[id: string]: RawThreadInfo },
): $ReadOnlyArray<CalendarFilter> {
  const currentlyFilteredIDs = filteredThreadIDs(state);
  if (!currentlyFilteredIDs) {
    return state;
  }
  const filtered = [...currentlyFilteredIDs].filter(threadID =>
    threadInFilterList(threadInfos[threadID]),
  );
  if (filtered.length < currentlyFilteredIDs.size) {
    return [
      ...nonThreadCalendarFilters(state),
      { type: 'threads', threadIDs: filtered },
    ];
  }
  return state;
}
