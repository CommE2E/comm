// @flow

import invariant from 'invariant';
import t, { type TUnion, type TInterface } from 'tcomb';

import { type ActivityUpdate } from './activity-types.js';
import type { Shape } from './core.js';
import type { SignedIdentityKeysBlob } from './crypto-types.js';
import { signedIdentityKeysBlobValidator } from './crypto-types.js';
import type { Platform, PlatformDetails } from './device-types.js';
import {
  type RawEntryInfo,
  type CalendarQuery,
  rawEntryInfoValidator,
} from './entry-types.js';
import type {
  ThreadInconsistencyReportShape,
  EntryInconsistencyReportShape,
  ClientThreadInconsistencyReportShape,
  ClientEntryInconsistencyReportShape,
} from './report-types.js';
import { type RawThreadInfo, rawThreadInfoValidator } from './thread-types.js';
import {
  type CurrentUserInfo,
  currentUserInfoValidator,
  type OldCurrentUserInfo,
  oldCurrentUserInfoValidator,
  type AccountUserInfo,
  accountUserInfoValidator,
} from './user-types.js';
import { tNumber, tShape, tID } from '../utils/validation-utils.js';

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
      serverRequestType === 8 ||
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

export type ThreadInconsistencyClientResponse = {
  ...ThreadInconsistencyReportShape,
  +type: 2,
};

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
const serverCheckStateServerRequestValidator =
  tShape<ServerCheckStateServerRequest>({
    type: tNumber(serverRequestTypes.CHECK_STATE),
    hashesToCheck: t.dict(t.String, t.Number),
    failUnmentioned: t.maybe(
      tShape({
        threadInfos: t.maybe(t.Boolean),
        entryInfos: t.maybe(t.Boolean),
        userInfos: t.maybe(t.Boolean),
      }),
    ),
    stateChanges: t.maybe(
      tShape({
        rawThreadInfos: t.maybe(t.list(rawThreadInfoValidator)),
        rawEntryInfos: t.maybe(t.list(rawEntryInfoValidator)),
        currentUserInfo: t.maybe(
          t.union([currentUserInfoValidator, oldCurrentUserInfoValidator]),
        ),
        userInfos: t.maybe(t.list(accountUserInfoValidator)),
        deleteThreadIDs: t.maybe(t.list(tID)),
        deleteEntryIDs: t.maybe(t.list(tID)),
        deleteUserInfoIDs: t.maybe(t.list(t.String)),
      }),
    ),
  });

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
const moreOneTimeKeysServerRequestValidator =
  tShape<MoreOneTimeKeysServerRequest>({
    type: tNumber(serverRequestTypes.MORE_ONE_TIME_KEYS),
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

export type ServerServerRequest =
  | PlatformServerRequest
  | PlatformDetailsServerRequest
  | ServerCheckStateServerRequest
  | MoreOneTimeKeysServerRequest
  | SignedIdentityKeysBlobServerRequest
  | InitialNotificationsEncryptedMessageServerRequest;
export const serverServerRequestValidator: TUnion<ServerServerRequest> =
  t.union([
    platformServerRequestValidator,
    platformDetailsServerRequestValidator,
    serverCheckStateServerRequestValidator,
    moreOneTimeKeysServerRequestValidator,
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
  | MoreOneTimeKeysServerRequest
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
};

export type GetSessionPublicKeysArgs = {
  +session: string,
};

export type OlmSessionInitializationInfo = {
  +prekey: string,
  +prekeySignature: string,
  +oneTimeKey: string,
};
export const olmSessionInitializationInfoValidator: TInterface<OlmSessionInitializationInfo> =
  tShape<OlmSessionInitializationInfo>({
    prekey: t.String,
    prekeySignature: t.String,
    oneTimeKey: t.String,
  });

export type GetOlmSessionInitializationDataResponse = {
  +signedIdentityKeysBlob: SignedIdentityKeysBlob,
  +contentInitializationInfo: OlmSessionInitializationInfo,
  +notifInitializationInfo: OlmSessionInitializationInfo,
};
export const getOlmSessionInitializationDataResponseValidator: TInterface<GetOlmSessionInitializationDataResponse> =
  tShape({
    signedIdentityKeysBlob: signedIdentityKeysBlobValidator,
    contentInitializationInfo: olmSessionInitializationInfoValidator,
    notifInitializationInfo: olmSessionInitializationInfoValidator,
  });
