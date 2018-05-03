// @flow

import type { RawMessageInfo } from './message-types';
import type { UserInfo, AccountUserInfo } from './user-types';
import type { CalendarFilter } from './filter-types';

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
  lastUserInteractionCalendar: number,
|};

export type CalendarQuery = {|
  startDate: string,
  endDate: string,
  filters: $ReadOnlyArray<CalendarFilter>,
|};

export type SaveEntryRequest = {|
  entryID: string,
  text: string,
  prevText: string,
  sessionID: string,
  timestamp: number,
|};

export type SaveEntryResult = {|
  entryID: string,
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
|};

export type SaveEntryResponse = {|
  ...SaveEntryResult,
  text: string,
|};

export type SaveEntryPayload = {|
  ...SaveEntryResponse,
  threadID: string,
|};

export type CreateEntryRequest = {|
  text: string,
  sessionID: string,
  timestamp: number,
  date: string,
  threadID: string,
|};

export type CreateEntryResponse = {|
  ...SaveEntryPayload,
  localID: string,
|};

export type DeleteEntryRequest = {|
  entryID: string,
  prevText: string,
  sessionID: string,
  timestamp: number,
|};

export type RestoreEntryRequest = {|
  entryID: string,
  sessionID: string,
  timestamp: number,
|};

export type DeleteEntryResponse = {|
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  threadID: string,
|};

export type RestoreEntryResponse = {|
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  entryInfo: RawEntryInfo,
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
