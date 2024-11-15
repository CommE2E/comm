// @flow

import invariant from 'invariant';
import t, { type TUnion, type TInterface } from 'tcomb';

import {
  type ActivityUpdate,
  activityUpdateValidator,
} from './activity-types.js';
import type { SignedIdentityKeysBlob } from './crypto-types.js';
import { signedIdentityKeysBlobValidator } from './crypto-types.js';
import type { Platform, PlatformDetails } from './device-types.js';
import {
  type RawEntryInfo,
  type CalendarQuery,
  rawEntryInfoValidator,
} from './entry-types.js';
import type { RawThreadInfo } from './minimally-encoded-thread-permissions-types';
import type { DispatchMetadata } from './redux-types.js';
import {
  type ThreadInconsistencyReportShape,
  type EntryInconsistencyReportShape,
  type ClientThreadInconsistencyReportShape,
  type ClientEntryInconsistencyReportShape,
  threadInconsistencyReportValidatorShape,
  entryInconsistencyReportValidatorShape,
} from './report-types.js';
import type { LegacyRawThreadInfo } from './thread-types.js';
import {
  type CurrentUserInfo,
  currentUserInfoValidator,
  type AccountUserInfo,
  accountUserInfoValidator,
} from './user-types.js';
import { mixedThinRawThreadInfoValidator } from '../permissions/minimally-encoded-raw-thread-info-validators.js';
import {
  tNumber,
  tShape,
  tID,
  tUserID,
  tPlatform,
  tPlatformDetails,
} from '../utils/validation-utils.js';

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
  // MORE_ONE_TIME_KEYS: 8, (DEPRECATED)
  SIGNED_IDENTITY_KEYS_BLOB: 9,
  INITIAL_NOTIFICATIONS_ENCRYPTED_MESSAGE: 10,
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
      serverRequestType === 9 ||
      serverRequestType === 10,
    'number is not ServerRequestType enum',
  );
  return serverRequestType;
}

type PlatformServerRequest = {
  +type: 0,
};
const platformServerRequestValidator = tShape<PlatformServerRequest>({
  type: tNumber(serverRequestTypes.PLATFORM),
});
type PlatformClientResponse = {
  +type: 0,
  +platform: Platform,
};
const platformClientResponseValidator: TInterface<PlatformClientResponse> =
  tShape({
    type: tNumber(serverRequestTypes.PLATFORM),
    platform: tPlatform,
  });

export type ThreadInconsistencyClientResponse = {
  ...ThreadInconsistencyReportShape,
  +type: 2,
};
const threadInconsistencyClientResponseValidator: TInterface<ThreadInconsistencyClientResponse> =
  tShape({
    ...threadInconsistencyReportValidatorShape,
    type: tNumber(serverRequestTypes.THREAD_INCONSISTENCY),
  });

type PlatformDetailsServerRequest = {
  type: 3,
};
const platformDetailsServerRequestValidator =
  tShape<PlatformDetailsServerRequest>({
    type: tNumber(serverRequestTypes.PLATFORM_DETAILS),
  });

type PlatformDetailsClientResponse = {
  type: 3,
  platformDetails: PlatformDetails,
};
const platformDetailsClientResponseValidator: TInterface<PlatformDetailsClientResponse> =
  tShape({
    type: tNumber(serverRequestTypes.PLATFORM_DETAILS),
    platformDetails: tPlatformDetails,
  });

export type EntryInconsistencyClientResponse = {
  type: 5,
  ...EntryInconsistencyReportShape,
};
const entryInconsistencyClientResponseValidator: TInterface<EntryInconsistencyClientResponse> =
  tShape({
    ...entryInconsistencyReportValidatorShape,
    type: tNumber(serverRequestTypes.ENTRY_INCONSISTENCY),
  });

type FailUnmentioned = Partial<{
  +threadInfos: boolean,
  +entryInfos: boolean,
  +userInfos: boolean,
}>;

type StateChanges = Partial<{
  +rawThreadInfos: LegacyRawThreadInfo[] | RawThreadInfo[],
  +rawEntryInfos: RawEntryInfo[],
  +currentUserInfo: CurrentUserInfo,
  +userInfos: AccountUserInfo[],
  +deleteThreadIDs: string[],
  +deleteEntryIDs: string[],
  +deleteUserInfoIDs: string[],
}>;

export type ServerCheckStateServerRequest = {
  +type: 6,
  +hashesToCheck: { +[key: string]: number },
  +failUnmentioned?: FailUnmentioned,
  +stateChanges?: StateChanges,
};
const serverCheckStateServerRequestValidator =
  tShape<ServerCheckStateServerRequest>({
    type: tNumber(serverRequestTypes.CHECK_STATE),
    hashesToCheck: t.dict(t.String, t.Number),
    failUnmentioned: t.maybe(
      tShape<FailUnmentioned>({
        threadInfos: t.maybe(t.Boolean),
        entryInfos: t.maybe(t.Boolean),
        userInfos: t.maybe(t.Boolean),
      }),
    ),
    stateChanges: t.maybe(
      tShape<StateChanges>({
        rawThreadInfos: t.maybe(t.list(mixedThinRawThreadInfoValidator)),
        rawEntryInfos: t.maybe(t.list(rawEntryInfoValidator)),
        currentUserInfo: t.maybe(currentUserInfoValidator),
        userInfos: t.maybe(t.list(accountUserInfoValidator)),
        deleteThreadIDs: t.maybe(t.list(tID)),
        deleteEntryIDs: t.maybe(t.list(tID)),
        deleteUserInfoIDs: t.maybe(t.list(tUserID)),
      }),
    ),
  });

type CheckStateClientResponse = {
  +type: 6,
  +hashResults: { +[key: string]: boolean },
};
const checkStateClientResponseValidator: TInterface<CheckStateClientResponse> =
  tShape({
    type: tNumber(serverRequestTypes.CHECK_STATE),
    hashResults: t.dict(t.String, t.Boolean),
  });

type InitialActivityUpdatesClientResponse = {
  +type: 7,
  +activityUpdates: $ReadOnlyArray<ActivityUpdate>,
};
const initialActivityUpdatesClientResponseValidator: TInterface<InitialActivityUpdatesClientResponse> =
  tShape({
    type: tNumber(serverRequestTypes.INITIAL_ACTIVITY_UPDATES),
    activityUpdates: t.list(activityUpdateValidator),
  });

type MoreOneTimeKeysClientResponse = {
  +type: 8,
  +keys: $ReadOnlyArray<string>,
};

type SignedIdentityKeysBlobServerRequest = {
  +type: 9,
};
const signedIdentityKeysBlobServerRequestValidator =
  tShape<SignedIdentityKeysBlobServerRequest>({
    type: tNumber(serverRequestTypes.SIGNED_IDENTITY_KEYS_BLOB),
  });

type SignedIdentityKeysBlobClientResponse = {
  +type: 9,
  +signedIdentityKeysBlob: SignedIdentityKeysBlob,
};
const signedIdentityKeysBlobClientResponseValidator: TInterface<SignedIdentityKeysBlobClientResponse> =
  tShape({
    type: tNumber(serverRequestTypes.SIGNED_IDENTITY_KEYS_BLOB),
    signedIdentityKeysBlob: signedIdentityKeysBlobValidator,
  });

type InitialNotificationsEncryptedMessageServerRequest = {
  +type: 10,
};
const initialNotificationsEncryptedMessageServerRequestValidator =
  tShape<InitialNotificationsEncryptedMessageServerRequest>({
    type: tNumber(serverRequestTypes.INITIAL_NOTIFICATIONS_ENCRYPTED_MESSAGE),
  });

type InitialNotificationsEncryptedMessageClientResponse = {
  +type: 10,
  +initialNotificationsEncryptedMessage: string,
};
const initialNotificationsEncryptedMessageClientResponseValidator: TInterface<InitialNotificationsEncryptedMessageClientResponse> =
  tShape({
    type: tNumber(serverRequestTypes.INITIAL_NOTIFICATIONS_ENCRYPTED_MESSAGE),
    initialNotificationsEncryptedMessage: t.String,
  });

export type ServerServerRequest =
  | PlatformServerRequest
  | PlatformDetailsServerRequest
  | ServerCheckStateServerRequest
  | SignedIdentityKeysBlobServerRequest
  | InitialNotificationsEncryptedMessageServerRequest;
export const serverServerRequestValidator: TUnion<ServerServerRequest> =
  t.union([
    platformServerRequestValidator,
    platformDetailsServerRequestValidator,
    serverCheckStateServerRequestValidator,
    signedIdentityKeysBlobServerRequestValidator,
    initialNotificationsEncryptedMessageServerRequestValidator,
  ]);

export type ClientResponse =
  | PlatformClientResponse
  | ThreadInconsistencyClientResponse
  | PlatformDetailsClientResponse
  | EntryInconsistencyClientResponse
  | CheckStateClientResponse
  | InitialActivityUpdatesClientResponse
  | MoreOneTimeKeysClientResponse
  | SignedIdentityKeysBlobClientResponse
  | InitialNotificationsEncryptedMessageClientResponse;

export type ClientCheckStateServerRequest = {
  +type: 6,
  +hashesToCheck: { +[key: string]: number },
  +failUnmentioned?: Partial<{
    +threadInfos: boolean,
    +entryInfos: boolean,
    +userInfos: boolean,
  }>,
  +stateChanges?: Partial<{
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
  | SignedIdentityKeysBlobServerRequest
  | InitialNotificationsEncryptedMessageServerRequest;

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
  | MoreOneTimeKeysClientResponse
  | SignedIdentityKeysBlobClientResponse
  | InitialNotificationsEncryptedMessageClientResponse;

export type ClientInconsistencyResponse =
  | ClientThreadInconsistencyClientResponse
  | ClientEntryInconsistencyClientResponse;

export const processServerRequestsActionType = 'PROCESS_SERVER_REQUESTS';
export type ProcessServerRequestsPayload = {
  +serverRequests: $ReadOnlyArray<ClientServerRequest>,
  +calendarQuery: CalendarQuery,
  +keyserverID: string,
};
export type ProcessServerRequestAction = {
  +dispatchMetadata?: DispatchMetadata,
  +type: 'PROCESS_SERVER_REQUESTS',
  +payload: ProcessServerRequestsPayload,
};

export const clientResponseInputValidator: TUnion<ClientResponse> = t.union([
  platformClientResponseValidator,
  threadInconsistencyClientResponseValidator,
  entryInconsistencyClientResponseValidator,
  platformDetailsClientResponseValidator,
  checkStateClientResponseValidator,
  initialActivityUpdatesClientResponseValidator,
  signedIdentityKeysBlobClientResponseValidator,
  initialNotificationsEncryptedMessageClientResponseValidator,
]);
