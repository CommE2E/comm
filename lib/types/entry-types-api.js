// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape } from '../utils/validation-utils';
import {
  type CalendarQuery,
  type RawEntryInfo,
  rawEntryInfoValidator,
} from './entry-types';
import { type RawMessageInfo, rawMessageInfoValidator } from './message-types';
import {
  type ServerCreateUpdatesResponse,
  type ClientCreateUpdatesResponse,
  serverCreateUpdatesResponseValidator,
} from './update-types';
import { type AccountUserInfo, accountUserInfoValidator } from './user-types';

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
export const saveEntryResponseValidator: TInterface = tShape({
  entryID: t.String,
  newMessageInfos: t.list(rawMessageInfoValidator),
  updatesResult: serverCreateUpdatesResponseValidator,
});

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
export const deleteEntryResponseValidator: TInterface = tShape({
  newMessageInfos: t.list(rawMessageInfoValidator),
  threadID: tID,
  updatesResult: serverCreateUpdatesResponseValidator,
});

export type DeleteEntryResult = {
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +threadID: string,
  +updatesResult: ClientCreateUpdatesResponse,
};

export type RestoreEntryResponse = {
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updatesResult: ServerCreateUpdatesResponse,
};
export const restoreEntryResponseValidator: TInterface = tShape({
  newMessageInfos: t.list(rawMessageInfoValidator),
  updatesResult: serverCreateUpdatesResponseValidator,
});

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
export const fetchEntryInfosBaseValidator: TInterface = tShape({
  rawEntryInfos: t.list(rawEntryInfoValidator),
});

export type FetchEntryInfosResponse = {
  ...FetchEntryInfosBase,
  +userInfos: { [id: string]: AccountUserInfo },
};
export const fetchEntryInfosResponseValidator: TInterface = tShape({
  rawEntryInfos: t.list(rawEntryInfoValidator),
  userInfos: t.dict(t.String, accountUserInfoValidator),
});
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
export const deltaEntryInfosResultValidator: TInterface = tShape({
  rawEntryInfos: t.list(rawEntryInfoValidator),
  deletedEntryIDs: t.list(t.String),
  userInfos: t.dict(t.String, accountUserInfoValidator),
});

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
