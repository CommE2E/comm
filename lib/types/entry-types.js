// @flow

import type { RawMessageInfo } from './message-types';
import type { UserInfo, AccountUserInfo } from './user-types';
import { type CalendarFilter, calendarFilterPropType } from './filter-types';
import type { CreateUpdatesResponse } from './update-types';
import type { EntryPollPushInconsistencyClientResponse } from './request-types';

import PropTypes from 'prop-types';

export type RawEntryInfo = {|
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  text: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  creationTime: number, // millisecond timestamp
  creatorID: string,
  deleted: bool,
|};

export const rawEntryInfoPropType = PropTypes.shape({
  id: PropTypes.string,
  localID: PropTypes.string,
  threadID: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  creationTime: PropTypes.number.isRequired,
  creatorID: PropTypes.string.isRequired,
  deleted: PropTypes.bool.isRequired,
});

export type EntryInfo = {|
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  text: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  creationTime: number, // millisecond timestamp
  creator: ?string,
  deleted: bool,
|};

export const entryInfoPropType = PropTypes.shape({
  id: PropTypes.string,
  localID: PropTypes.string,
  threadID: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  creationTime: PropTypes.number.isRequired,
  creator: PropTypes.string,
  deleted: PropTypes.bool.isRequired,
});

export type EntryStore = {|
  entryInfos: {[id: string]: RawEntryInfo},
  daysToEntries: {[day: string]: string[]},
  actualizedCalendarQuery: CalendarQuery,
  lastUserInteractionCalendar: number,
  inconsistencyResponses:
    $ReadOnlyArray<EntryPollPushInconsistencyClientResponse>,
|};

export type CalendarQuery = {|
  startDate: string,
  endDate: string,
  filters: $ReadOnlyArray<CalendarFilter>,
|};

export const calendarQueryPropType = PropTypes.shape({
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  filters: PropTypes.arrayOf(calendarFilterPropType).isRequired,
});

export type SaveEntryInfo = {|
  entryID: string,
  text: string,
  prevText: string,
  sessionID: string,
  timestamp: number,
  calendarQuery: CalendarQuery,
|};

export type SaveEntryRequest = {|
  entryID: string,
  text: string,
  prevText: string,
  sessionID: string,
  timestamp: number,
  calendarQuery?: CalendarQuery,
|};

export type SaveEntryResult = {|
  entryID: string,
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  updatesResult: CreateUpdatesResponse,
|};

export type SaveEntryResponse = {|
  ...SaveEntryResult,
  text: string,
|};

export type SaveEntryPayload = {|
  ...SaveEntryResponse,
  threadID: string,
|};

export type CreateEntryInfo = {|
  text: string,
  sessionID: string,
  timestamp: number,
  date: string,
  threadID: string,
  calendarQuery: CalendarQuery,
|};

export type CreateEntryRequest = {|
  text: string,
  sessionID: string,
  timestamp: number,
  date: string,
  threadID: string,
  calendarQuery?: CalendarQuery,
|};

export type CreateEntryResponse = {|
  ...SaveEntryPayload,
  localID: string,
|};

export type DeleteEntryInfo = {|
  entryID: string,
  prevText: string,
  sessionID: string,
  calendarQuery: CalendarQuery,
|};

export type DeleteEntryRequest = {|
  entryID: string,
  prevText: string,
  sessionID: string,
  timestamp: number,
  calendarQuery?: CalendarQuery,
|};

export type RestoreEntryInfo = {|
  entryID: string,
  sessionID: string,
  calendarQuery: CalendarQuery,
|};

export type RestoreEntryRequest = {|
  entryID: string,
  sessionID: string,
  timestamp: number,
  calendarQuery?: CalendarQuery,
|};

export type DeleteEntryResponse = {|
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  threadID: string,
  updatesResult: CreateUpdatesResponse,
|};

export type RestoreEntryResponse = {|
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  entryInfo: RawEntryInfo,
  updatesResult: CreateUpdatesResponse,
|};

export type FetchEntryInfosResponse = {|
  rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  userInfos: {[id: string]: AccountUserInfo},
|};

export type FetchEntryInfosResult = {|
  rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  userInfos: $ReadOnlyArray<AccountUserInfo>,
|};

export type CalendarResult = {|
  rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  calendarQuery: CalendarQuery,
  userInfos: $ReadOnlyArray<UserInfo>,
|};

export type CalendarQueryUpdateResult = {|
  rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  userInfos: $ReadOnlyArray<AccountUserInfo>,
  calendarQuery?: CalendarQuery,
|};
