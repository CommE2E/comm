// @flow

import { type Platform, isWebPlatform } from './device-types.js';
import { type CalendarFilter, defaultCalendarFilters } from './filter-types.js';
import type { RawMessageInfo } from './message-types.js';
import type {
  ServerCreateUpdatesResponse,
  ClientCreateUpdatesResponse,
} from './update-types.js';
import type { UserInfo, AccountUserInfo } from './user-types.js';
import {
  fifteenDaysEarlier,
  fifteenDaysLater,
  thisMonthDates,
} from '../utils/date-utils.js';

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

export type EntryInfo = {
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  text: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  creationTime: number, // millisecond timestamp
  creator: ?UserInfo,
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
  if (isWebPlatform(platform)) {
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

export type SaveEntryRequest = {
  +entryID: string,
  +text: string,
  +prevText: string,
  +timestamp: number,
  +calendarQuery?: CalendarQuery,
};

export type SaveEntryResponse = {
  +entryID: string,
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updatesResult: ServerCreateUpdatesResponse,
};

export type SaveEntryResult = {
  +entryID: string,
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updatesResult: ClientCreateUpdatesResponse,
};

export type SaveEntryPayload = {
  ...SaveEntryResult,
  +threadID: string,
};

export type CreateEntryInfo = {
  +text: string,
  +timestamp: number,
  +date: string,
  +threadID: string,
  +localID: string,
  +calendarQuery: CalendarQuery,
};

export type CreateEntryRequest = {
  +text: string,
  +timestamp: number,
  +date: string,
  +threadID: string,
  +localID?: string,
  +calendarQuery?: CalendarQuery,
};

export type CreateEntryPayload = {
  ...SaveEntryPayload,
  +localID: string,
};

export type DeleteEntryInfo = {
  +entryID: string,
  +prevText: string,
  +calendarQuery: CalendarQuery,
};

export type DeleteEntryRequest = {
  +entryID: string,
  +prevText: string,
  +timestamp: number,
  +calendarQuery?: CalendarQuery,
};

export type RestoreEntryInfo = {
  +entryID: string,
  +calendarQuery: CalendarQuery,
};

export type RestoreEntryRequest = {
  +entryID: string,
  +timestamp: number,
  +calendarQuery?: CalendarQuery,
};

export type DeleteEntryResponse = {
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +threadID: string,
  +updatesResult: ServerCreateUpdatesResponse,
};

export type DeleteEntryResult = {
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +threadID: string,
  +updatesResult: ClientCreateUpdatesResponse,
};

export type RestoreEntryResponse = {
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updatesResult: ServerCreateUpdatesResponse,
};
export type RestoreEntryResult = {
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updatesResult: ClientCreateUpdatesResponse,
};
export type RestoreEntryPayload = {
  ...RestoreEntryResult,
  +threadID: string,
};

export type FetchEntryInfosBase = {
  +rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
};
export type FetchEntryInfosResponse = {
  ...FetchEntryInfosBase,
  +userInfos: { [id: string]: AccountUserInfo },
};
export type FetchEntryInfosResult = FetchEntryInfosBase;

export type DeltaEntryInfosResponse = {
  +rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  +deletedEntryIDs: $ReadOnlyArray<string>,
};
export type DeltaEntryInfosResult = {
  +rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  +deletedEntryIDs: $ReadOnlyArray<string>,
  +userInfos: $ReadOnlyArray<AccountUserInfo>,
};

export type CalendarResult = {
  +rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  +calendarQuery: CalendarQuery,
};

export type CalendarQueryUpdateStartingPayload = {
  +calendarQuery?: CalendarQuery,
};
export type CalendarQueryUpdateResult = {
  +rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  +deletedEntryIDs: $ReadOnlyArray<string>,
  +calendarQuery: CalendarQuery,
  +calendarQueryAlreadyUpdated: boolean,
};
