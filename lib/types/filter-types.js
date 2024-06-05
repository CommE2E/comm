// @flow

import t, { type TUnion } from 'tcomb';

import type { ResolvedThreadInfo } from './minimally-encoded-thread-permissions-types.js';
import { tID, tShape, tString } from '../utils/validation-utils.js';

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
export type NotDeletedFilter = { +type: 'not_deleted' };
export type CalendarFilter = NotDeletedFilter | CalendarThreadFilter;

export const calendarFilterValidator: TUnion<CalendarFilter> = t.union([
  tShape<CalendarThreadFilter>({
    type: tString(calendarThreadFilterTypes.THREAD_LIST),
    threadIDs: t.list(tID),
  }),
  tShape<NotDeletedFilter>({
    type: tString(calendarThreadFilterTypes.NOT_DELETED),
  }),
]);

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
