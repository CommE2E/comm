// @flow

import { createSelector } from 'reselect';

import {
  type CalendarFilter,
  calendarThreadFilterTypes,
  type CalendarThreadFilterType,
} from '../types/filter-types.js';
import type { BaseAppState } from '../types/redux-types.js';

function filteredThreadIDs(
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
): ?Set<string> {
  let threadIDs = [];
  let threadListFilterExists = false;
  for (const filter of calendarFilters) {
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

const filteredThreadIDsSelector: (
  state: BaseAppState<*>,
) => ?$ReadOnlySet<string> = createSelector(
  (state: BaseAppState<*>) => state.calendarFilters,
  filteredThreadIDs,
);

function filterFilters(
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  filterTypeToExclude: CalendarThreadFilterType,
): $ReadOnlyArray<CalendarFilter> {
  const filteredFilters = [];
  for (const filter of calendarFilters) {
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

const nonThreadCalendarFiltersSelector: (
  state: BaseAppState<*>,
) => $ReadOnlyArray<CalendarFilter> = createSelector(
  (state: BaseAppState<*>) => state.calendarFilters,
  nonThreadCalendarFilters,
);

function nonExcludeDeletedCalendarFilters(
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
): $ReadOnlyArray<CalendarFilter> {
  return filterFilters(calendarFilters, calendarThreadFilterTypes.NOT_DELETED);
}

const nonExcludeDeletedCalendarFiltersSelector: (
  state: BaseAppState<*>,
) => $ReadOnlyArray<CalendarFilter> = createSelector(
  (state: BaseAppState<*>) => state.calendarFilters,
  nonExcludeDeletedCalendarFilters,
);

function filterExists(
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  filterType: CalendarThreadFilterType,
): boolean {
  for (const filter of calendarFilters) {
    if (filter.type === filterType) {
      return true;
    }
  }
  return false;
}

const includeDeletedSelector: (state: BaseAppState<*>) => boolean =
  createSelector(
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
