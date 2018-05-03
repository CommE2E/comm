// @flow

import PropTypes from 'prop-types';

export const calendarThreadFilterTypes = Object.freeze({
  THREAD_LIST: "threads",
  NOT_DELETED: "not_deleted",
});
export type CalendarThreadFilterType =
  $Values<typeof calendarThreadFilterTypes>;

export type CalendarThreadFilter =
  {| type: "threads", threadIDs: $ReadOnlyArray<string> |};
export type CalendarFilter =
  | {| type: "not_deleted" |}
  | CalendarThreadFilter;

export const calendarFilterPropType = PropTypes.oneOfType([
  PropTypes.shape({
    type: PropTypes.oneOf([ calendarThreadFilterTypes.NOT_DELETED ]).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ calendarThreadFilterTypes.THREAD_LIST ]).isRequired,
    threadIDs: PropTypes.arrayOf(PropTypes.string).isRequired,
  }),
]);

export const defaultCalendarFilters = [
  { type: calendarThreadFilterTypes.NOT_DELETED },
];

export const updateCalendarThreadFilter = "UPDATE_CALENDAR_THREAD_FILTER";
export const clearCalendarThreadFilter = "CLEAR_CALENDAR_THREAD_FILTER";
