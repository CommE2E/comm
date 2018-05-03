// @flow

import {
  type CalendarFilter,
  defaultCalendarFilters,
  updateCalendarThreadFilter,
  clearCalendarThreadFilter,
} from '../types/filter-types';
import type { BaseAction } from '../types/redux-types';
import type { RawThreadInfo } from '../types/thread-types';

import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  resetPasswordActionTypes,
  registerActionTypes,
} from '../actions/user-actions';
import {
  filteredThreadIDs,
  nonThreadCalendarFilters,
} from '../selectors/calendar-filter-selectors';
import {
  joinThreadActionTypes,
  deleteThreadActionTypes,
  leaveThreadActionTypes,
  newThreadActionTypes,
} from '../actions/thread-actions';
import { viewerIsMember } from '../shared/thread-utils';

export default function reduceCalendarFilters(
  state: $ReadOnlyArray<CalendarFilter>,
  action: BaseAction,
  newThreadInfos: {[id: string]: RawThreadInfo},
  oldThreadInfos: {[id: string]: RawThreadInfo},
): $ReadOnlyArray<CalendarFilter> {
  if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    action.type === logInActionTypes.success ||
    action.type === registerActionTypes.success ||
    action.type === resetPasswordActionTypes.success
  ) {
    return defaultCalendarFilters;
  } else if (action.type === updateCalendarThreadFilter) {
    const nonThreadFilters = nonThreadCalendarFilters(state);
    return [
      ...nonThreadFilters,
      action.payload,
    ];
  } else if (action.type === clearCalendarThreadFilter) {
    return nonThreadCalendarFilters(state);
  }

  // The following should handle:
  // - joinThreadActionTypes.success
  // - newThreadActionTypes.success
  // - pingActionTypes.success
  // - deleteThreadActionTypes.success
  // - leaveThreadActionTypes.success
  const currentlyFilteredIDs = filteredThreadIDs(state);
  if (!currentlyFilteredIDs) {
    return state;
  }
  const validCurrentFilteredIDs = [...currentlyFilteredIDs].filter(
    threadID => !!newThreadInfos[threadID],
  );
  const joinedThreadIDs = [];
  for (let threadID in newThreadInfos) {
    const newThreadInfo = newThreadInfos[threadID];
    if (!oldThreadInfos[threadID] && viewerIsMember(newThreadInfo)) {
      joinedThreadIDs.push(threadID);
    }
  }
  const newFilteredIDs = [
    ...validCurrentFilteredIDs,
    ...joinedThreadIDs,
  ];
  const nonThreadFilters = nonThreadCalendarFilters(state);
  return [
    ...nonThreadFilters,
    { type: "threads", threadIDs: newFilteredIDs },
  ];
}
