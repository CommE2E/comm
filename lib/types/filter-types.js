// @flow

import type { ResolvedThreadInfo } from './thread-types';

export const calendarThreadFilterTypes = Object.freeze({
  THREAD_LIST: 'threads',
  NOT_DELETED: 'not_deleted',
});
export type CalendarThreadFilterType = $Values<
  typeof calendarThreadFilterTypes,
>;

export type CalendarThreadFilter = {
  +type: 'threads',
  +threadIDs: $ReadOnlyArray<string>,
};
export type CalendarFilter = { +type: 'not_deleted' } | CalendarThreadFilter;

export const defaultCalendarFilters: $ReadOnlyArray<CalendarFilter> = [
  { type: calendarThreadFilterTypes.NOT_DELETED },
];

export const updateCalendarThreadFilter = 'UPDATE_CALENDAR_THREAD_FILTER';
export const clearCalendarThreadFilter = 'CLEAR_CALENDAR_THREAD_FILTER';
export const setCalendarDeletedFilter = 'SET_CALENDAR_DELETED_FILTER';

export type SetCalendarDeletedFilterPayload = {
  +includeDeleted: boolean,
};

export type FilterThreadInfo = {
  +threadInfo: ResolvedThreadInfo,
  +numVisibleEntries: number,
};
