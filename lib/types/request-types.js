// @flow

import invariant from 'invariant';

import { type ActivityUpdate } from './activity-types';
import type { Shape } from './core';
import type { Platform, PlatformDetails } from './device-types';
import type { RawEntryInfo, CalendarQuery } from './entry-types';
import type {
  ThreadInconsistencyReportShape,
  EntryInconsistencyReportShape,
  ClientThreadInconsistencyReportShape,
  ClientEntryInconsistencyReportShape,
} from './report-types';
import type { RawThreadInfo } from './thread-types';
import type {
  CurrentUserInfo,
  OldCurrentUserInfo,
  AccountUserInfo,
} from './user-types';

// "Server requests" are requests for information that the server delivers to
// clients. Clients then respond to those requests with a "client response".
export const serverRequestTypes = Object.freeze({
  PLATFORM: 0,
  //DEVICE_TOKEN: 1,            (DEPRECATED)
  THREAD_INCONSISTENCY: 2,
  PLATFORM_DETAILS: 3,
  //INITIAL_ACTIVITY_UPDATE: 4, (DEPRECATED)
  ENTRY_INCONSISTENCY: 5,
  CHECK_STATE: 6,
  INITIAL_ACTIVITY_UPDATES: 7,
  MORE_ONE_TIME_KEYS: 8,
});
type ServerRequestType = $Values<typeof serverRequestTypes>;
export function assertServerRequestType(
  serverRequestType: number,
): ServerRequestType {
  invariant(
    serverRequestType === 0 ||
      serverRequestType === 2 ||
      serverRequestType === 3 ||
      serverRequestType === 5 ||
      serverRequestType === 6 ||
      serverRequestType === 7 ||
      serverRequestType === 8,
    'number is not ServerRequestType enum',
  );
  return serverRequestType;
}

type PlatformServerRequest = {
  +type: 0,
};
type PlatformClientResponse = {
  +type: 0,
  +platform: Platform,
};

export type ThreadInconsistencyClientResponse = {
  ...ThreadInconsistencyReportShape,
  +type: 2,
};

type PlatformDetailsServerRequest = {
  type: 3,
};
type PlatformDetailsClientResponse = {
  type: 3,
  platformDetails: PlatformDetails,
};

export type EntryInconsistencyClientResponse = {
  type: 5,
  ...EntryInconsistencyReportShape,
};

export type ServerCheckStateServerRequest = {
  +type: 6,
  +hashesToCheck: { +[key: string]: number },
  +failUnmentioned?: Shape<{
    +threadInfos: boolean,
    +entryInfos: boolean,
    +userInfos: boolean,
  }>,
  +stateChanges?: Shape<{
    +rawThreadInfos: RawThreadInfo[],
    +rawEntryInfos: RawEntryInfo[],
    +currentUserInfo: CurrentUserInfo | OldCurrentUserInfo,
    +userInfos: AccountUserInfo[],
    +deleteThreadIDs: string[],
    +deleteEntryIDs: string[],
    +deleteUserInfoIDs: string[],
  }>,
};
type CheckStateClientResponse = {
  +type: 6,
  +hashResults: { +[key: string]: boolean },
};

type InitialActivityUpdatesClientResponse = {
  +type: 7,
  +activityUpdates: $ReadOnlyArray<ActivityUpdate>,
};

type MoreOneTimeKeysServerRequest = {
  +type: 8,
};
type MoreOneTimeKeysClientResponse = {
  +type: 8,
  +keys: $ReadOnlyArray<string>,
};

export type ServerServerRequest =
  | PlatformServerRequest
  | PlatformDetailsServerRequest
  | ServerCheckStateServerRequest
  | MoreOneTimeKeysServerRequest;
export type ClientResponse =
  | PlatformClientResponse
  | ThreadInconsistencyClientResponse
  | PlatformDetailsClientResponse
  | EntryInconsistencyClientResponse
  | CheckStateClientResponse
  | InitialActivityUpdatesClientResponse
  | MoreOneTimeKeysClientResponse;

export type ClientCheckStateServerRequest = {
  +type: 6,
  +hashesToCheck: { +[key: string]: number },
  +failUnmentioned?: Shape<{
    +threadInfos: boolean,
    +entryInfos: boolean,
    +userInfos: boolean,
  }>,
  +stateChanges?: Shape<{
    +rawThreadInfos: RawThreadInfo[],
    +rawEntryInfos: RawEntryInfo[],
    +currentUserInfo: CurrentUserInfo,
    +userInfos: AccountUserInfo[],
    +deleteThreadIDs: string[],
    +deleteEntryIDs: string[],
    +deleteUserInfoIDs: string[],
  }>,
};
export type ClientServerRequest =
  | PlatformServerRequest
  | PlatformDetailsServerRequest
  | ClientCheckStateServerRequest
  | MoreOneTimeKeysServerRequest;

// This is just the client variant of ClientResponse. The server needs to handle
// multiple client versions so the type supports old versions of certain client
// responses, but the client variant only need to support the latest version.
type ClientThreadInconsistencyClientResponse = {
  ...ClientThreadInconsistencyReportShape,
  +type: 2,
};
type ClientEntryInconsistencyClientResponse = {
  +type: 5,
  ...ClientEntryInconsistencyReportShape,
};
export type ClientClientResponse =
  | PlatformClientResponse
  | ClientThreadInconsistencyClientResponse
  | PlatformDetailsClientResponse
  | ClientEntryInconsistencyClientResponse
  | CheckStateClientResponse
  | InitialActivityUpdatesClientResponse
  | MoreOneTimeKeysClientResponse;

export type ClientInconsistencyResponse =
  | ClientThreadInconsistencyClientResponse
  | ClientEntryInconsistencyClientResponse;

export const processServerRequestsActionType = 'PROCESS_SERVER_REQUESTS';
export type ProcessServerRequestsPayload = {
  +serverRequests: $ReadOnlyArray<ClientServerRequest>,
  +calendarQuery: CalendarQuery,
};

export type GetSessionPublicKeysArgs = {
  +session: string,
};
