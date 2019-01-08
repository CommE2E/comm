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

const filteredThreadIDsSelector = createSelector<*, *, *, *>(
  (state: BaseAppState<*>) => state.calendarFilters,
  filteredThreadIDs,
);

function filterFilters(
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  filterTypeToExclude: CalendarThreadFilterType,
): $ReadOnlyArray<CalendarFilter> {
  const filteredFilters = [];
  for (let filter of calendarFilters) {
    if (filter.type !== filterTypeToExclude) {
      filteredFilters.push(filter);
    }
  }
  return filteredFilters;
}

function nonThreadCalendarFilters(
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
): $ReadOnlyArray<CalendarFilter> {
  return filterFilters(calendarFilters, calendarThreadFilterTypes.THREAD_LIST);
}

const nonThreadCalendarFiltersSelector = createSelector<*, *, *, *>(
  (state: BaseAppState<*>) => state.calendarFilters,
  nonThreadCalendarFilters,
);

function nonExcludeDeletedCalendarFilters(
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
): $ReadOnlyArray<CalendarFilter> {
  return filterFilters(calendarFilters, calendarThreadFilterTypes.NOT_DELETED);
}

const nonExcludeDeletedCalendarFiltersSelector = createSelector<*, *, *, *>(
  (state: BaseAppState<*>) => state.calendarFilters,
  nonExcludeDeletedCalendarFilters,
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

const includeDeletedSelector = createSelector<*, *, *, *>(
  (state: BaseAppState<*>) => state.calendarFilters,
  (calendarFilters: $ReadOnlyArray<CalendarFilter>) =>
    !filterExists(calendarFilters, calendarThreadFilterTypes.NOT_DELETED),
);

export {
  filteredThreadIDs,
  filteredThreadIDsSelector,
  nonThreadCalendarFilters,
  nonThreadCalendarFiltersSelector,
  nonExcludeDeletedCalendarFilters,
  nonExcludeDeletedCalendarFiltersSelector,
  filterExists,
  includeDeletedSelector,
};
