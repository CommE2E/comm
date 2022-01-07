// @flow

import t, { type TInterface } from 'tcomb';

import {
  fifteenDaysEarlier,
  fifteenDaysLater,
  thisMonthDates,
} from '../utils/date-utils';
import { tID, tShape } from '../utils/validation-utils';
import type { Platform } from './device-types';
import { type CalendarFilter, defaultCalendarFilters } from './filter-types';
export type RawEntryInfo = {
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  text: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  creationTime: number, // millisecond timestamp
  creatorID: string,
  deleted: boolean,
};

export const rawEntryInfoValidator: TInterface = tShape({
  id: t.maybe(t.String),
  localID: t.maybe(t.String),
  threadID: tID,
  text: t.String,
  year: t.Number,
  month: t.Number,
  day: t.Number,
  creationTime: t.Number,
  creatorID: t.String,
  deleted: t.Boolean,
});

export type EntryInfo = {
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  text: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  creationTime: number, // millisecond timestamp
  creator: ?string,
  deleted: boolean,
};

export type EntryStore = {
  +entryInfos: { +[id: string]: RawEntryInfo },
  +daysToEntries: { +[day: string]: string[] },
  +lastUserInteractionCalendar: number,
};

export type CalendarQuery = {
  +startDate: string,
  +endDate: string,
  +filters: $ReadOnlyArray<CalendarFilter>,
};

export const defaultCalendarQuery = (
  platform: ?Platform,
  timeZone?: ?string,
): CalendarQuery => {
  if (platform === 'web') {
    return {
      ...thisMonthDates(timeZone),
      filters: defaultCalendarFilters,
    };
  } else {
    return {
      startDate: fifteenDaysEarlier(timeZone).valueOf(),
      endDate: fifteenDaysLater(timeZone).valueOf(),
      filters: defaultCalendarFilters,
    };
  }
};

export type SaveEntryInfo = {
  +entryID: string,
  +text: string,
  +prevText: string,
  +timestamp: number,
  +calendarQuery: CalendarQuery,
};
