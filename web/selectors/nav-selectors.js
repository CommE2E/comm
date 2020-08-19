// @flow

import type { AppState, NavInfo } from '../redux/redux-setup';
import type { CalendarFilter } from 'lib/types/filter-types';
import type { CalendarQuery } from 'lib/types/entry-types';

import { createSelector } from 'reselect';
import invariant from 'invariant';

import { currentCalendarQuery } from 'lib/selectors/nav-selectors';
import { nonThreadCalendarFiltersSelector } from 'lib/selectors/calendar-filter-selectors';

const dateExtractionRegex = /^([0-9]{4})-([0-9]{2})-[0-9]{2}$/;

function yearExtractor(startDate: string, endDate: string): ?number {
  const startDateResults = dateExtractionRegex.exec(startDate);
  const endDateResults = dateExtractionRegex.exec(endDate);
  if (
    !startDateResults ||
    !startDateResults[1] ||
    !endDateResults ||
    !endDateResults[1] ||
    startDateResults[1] !== endDateResults[1]
  ) {
    return null;
  }
  return parseInt(startDateResults[1], 10);
}

function yearAssertingExtractor(startDate: string, endDate: string): number {
  const result = yearExtractor(startDate, endDate);
  invariant(
    result !== null && result !== undefined,
    `${startDate} and ${endDate} aren't in the same year`,
  );
  return result;
}

const yearAssertingSelector: (state: AppState) => number = createSelector(
  (state: AppState) => state.navInfo.startDate,
  (state: AppState) => state.navInfo.endDate,
  yearAssertingExtractor,
);

// 1-indexed
function monthExtractor(startDate: string, endDate: string): ?number {
  const startDateResults = dateExtractionRegex.exec(startDate);
  const endDateResults = dateExtractionRegex.exec(endDate);
  if (
    !startDateResults ||
    !startDateResults[1] ||
    !startDateResults[2] ||
    !endDateResults ||
    !endDateResults[1] ||
    !endDateResults[2] ||
    startDateResults[1] !== endDateResults[1] ||
    startDateResults[2] !== endDateResults[2]
  ) {
    return null;
  }
  return parseInt(startDateResults[2], 10);
}

// 1-indexed
function monthAssertingExtractor(startDate: string, endDate: string): number {
  const result = monthExtractor(startDate, endDate);
  invariant(
    result !== null && result !== undefined,
    `${startDate} and ${endDate} aren't in the same month`,
  );
  return result;
}

// 1-indexed
const monthAssertingSelector: (state: AppState) => number = createSelector(
  (state: AppState) => state.navInfo.startDate,
  (state: AppState) => state.navInfo.endDate,
  monthAssertingExtractor,
);

function activeThreadFromNavInfo(navInfo: NavInfo): ?string {
  return navInfo.tab === 'chat' ? navInfo.activeChatThreadID : null;
}

function activeThreadSelector(state: AppState): ?string {
  return activeThreadFromNavInfo(state.navInfo);
}

const webCalendarQuery: (
  state: AppState,
) => () => CalendarQuery = createSelector(
  currentCalendarQuery,
  (state: AppState) => state.navInfo.tab === 'calendar',
  (
    calendarQuery: (calendarActive: boolean) => CalendarQuery,
    calendarActive: boolean,
  ) => () => calendarQuery(calendarActive),
);

const nonThreadCalendarQuery: (
  state: AppState,
) => () => CalendarQuery = createSelector(
  webCalendarQuery,
  nonThreadCalendarFiltersSelector,
  (
    calendarQuery: () => CalendarQuery,
    filters: $ReadOnlyArray<CalendarFilter>,
  ) => {
    return (): CalendarQuery => {
      const query = calendarQuery();
      return {
        startDate: query.startDate,
        endDate: query.endDate,
        filters,
      };
    };
  },
);

export {
  yearExtractor,
  yearAssertingSelector,
  monthExtractor,
  monthAssertingSelector,
  activeThreadFromNavInfo,
  activeThreadSelector,
  webCalendarQuery,
  nonThreadCalendarQuery,
};
