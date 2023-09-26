// @flow

import {
  updateCalendarCommunityFilter,
  clearCalendarCommunityFilter,
} from '../actions/community-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  newThreadActionTypes,
  joinThreadActionTypes,
  leaveThreadActionTypes,
  deleteThreadActionTypes,
} from '../actions/thread-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
} from '../actions/user-actions.js';
import {
  filteredThreadIDs,
  nonThreadCalendarFilters,
  nonExcludeDeletedCalendarFilters,
} from '../selectors/calendar-filter-selectors.js';
import { threadInFilterList } from '../shared/thread-utils.js';
import { updateSpecs } from '../shared/updates/update-specs.js';
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
} from '../types/socket-types.js';
import type { RawThreadInfo, ThreadStore } from '../types/thread-types.js';
import {
  type ClientUpdateInfo,
  processUpdatesActionType,
} from '../types/update-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';
import { filterThreadIDsBelongingToCommunity } from '../utils/drawer-utils.react.js';

export default function reduceCalendarFilters(
  state: $ReadOnlyArray<CalendarFilter>,
  action: BaseAction,
  threadStore: ThreadStore,
): $ReadOnlyArray<CalendarFilter> {
  if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === registerActionTypes.success ||
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
