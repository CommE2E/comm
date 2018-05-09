// @flow

import type { BaseAppState } from '../types/redux-types';
import {
  type CalendarFilter,
  calendarThreadFilterTypes,
  type CalendarThreadFilterType,
} from '../types/filter-types';

import { createSelector } from 'reselect';
import invariant from 'invariant';

function filteredThreadIDs(
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
): ?Set<string> {
  let threadIDs = [];
  let threadListFilterExists = false;
  for (let filter of calendarFilters) {
    if (filter.type === calendarThreadFilterTypes.THREAD_LIST) {
      threadListFilterExists = true;
      threadIDs = [...threadIDs, ...filter.threadIDs];
    }
  }
  if (!threadListFilterExists) {
    return null;
  }
  return new Set(threadIDs);
}

const filteredThreadIDsSelector = createSelector(
  (state: BaseAppState<*>) => state.calendarFilters,
  filteredThreadIDs,
);

function nonThreadCalendarFilters(
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
): $ReadOnlyArray<CalendarFilter> {
  const filteredFilters = []; // lol
  for (let filter of calendarFilters) {
    if (filter.type !== "threads") {
      filteredFilters.push(filter);
    }
  }
  return filteredFilters;
}

const nonThreadCalendarFiltersSelector = createSelector(
  (state: BaseAppState<*>) => state.calendarFilters,
  nonThreadCalendarFilters,
);

const includeDeletedCalendarFilters = createSelector(
  (state: BaseAppState<*>) => state.calendarFilters,
  (
    calendarFilters: $ReadOnlyArray<CalendarFilter>,
  ): $ReadOnlyArray<CalendarFilter> => {
    const filteredFilters = []; // lol
    for (let filter of calendarFilters) {
      if (filter.type !== calendarThreadFilterTypes.NOT_DELETED) {
        filteredFilters.push(filter);
      }
    }
    return filteredFilters;
  },
);

function filterExists(
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  filterType: CalendarThreadFilterType,
): bool {
  for (let filter of calendarFilters) {
    if (filter.type === filterType) {
      return true;
    }
  }
  return false;
}

export {
  filteredThreadIDs,
  filteredThreadIDsSelector,
  nonThreadCalendarFilters,
  nonThreadCalendarFiltersSelector,
  includeDeletedCalendarFilters,
  filterExists,
};
