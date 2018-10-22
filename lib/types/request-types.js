// @flow

import {
  type Platform,
  type PlatformDetails,
  platformPropType,
  platformDetailsPropType,
} from './device-types';
import { type RawThreadInfo, rawThreadInfoPropType } from './thread-types';
import {
  type RawEntryInfo,
  type CalendarQuery,
  rawEntryInfoPropType,
  calendarQueryPropType,
} from './entry-types';
import type { BaseAction } from './redux-types';
import type { ActivityUpdate } from './activity-types';
import {
  type CurrentUserInfo,
  type AccountUserInfo,
  accountUserInfoPropType,
  currentUserPropType,
} from './user-types';

import invariant from 'invariant';
import PropTypes from 'prop-types';

// "Server requests" are requests for information that the server delivers to
// clients. Clients then respond to those requests with a "client response".
export const serverRequestTypes = Object.freeze({
  PLATFORM: 0,
  DEVICE_TOKEN: 1,
  THREAD_INCONSISTENCY: 2,
  PLATFORM_DETAILS: 3,
  INITIAL_ACTIVITY_UPDATE: 4,
  ENTRY_INCONSISTENCY: 5,
  CHECK_STATE: 6,
  INITIAL_ACTIVITY_UPDATES: 7,
});
type ServerRequestType = $Values<typeof serverRequestTypes>;
function assertServerRequestType(
  serverRequestType: number,
): ServerRequestType {
  invariant(
    serverRequestType === 0 ||
      serverRequestType === 1 ||
      serverRequestType === 2 ||
      serverRequestType === 3 ||
      serverRequestType === 4 ||
      serverRequestType === 5 ||
      serverRequestType === 6 ||
      serverRequestType === 7,
    "number is not ServerRequestType enum",
  );
  return serverRequestType;
}

type PlatformServerRequest = {|
  type: 0,
|};
type PlatformClientResponse = {|
  type: 0,
  platform: Platform,
|};

type DeviceTokenServerRequest = {|
  type: 1,
|};
type DeviceTokenClientResponse = {|
  type: 1,
  deviceToken: string,
|};

export type ThreadInconsistencyClientResponse = {|
  type: 2,
  platformDetails: PlatformDetails,
  beforeAction: {[id: string]: RawThreadInfo},
  action: BaseAction,
  pollResult: {[id: string]: RawThreadInfo},
  pushResult: {[id: string]: RawThreadInfo},
  lastActionTypes?: $ReadOnlyArray<$PropertyType<BaseAction, 'type'>>,
  time?: number,
|};

type PlatformDetailsServerRequest = {|
  type: 3,
|};
type PlatformDetailsClientResponse = {|
  type: 3,
  platformDetails: PlatformDetails,
|};

type InitialActivityUpdateClientResponse = {|
  type: 4,
  threadID: string,
|};

export type EntryInconsistencyClientResponse = {|
  type: 5,
  platformDetails: PlatformDetails,
  beforeAction: {[id: string]: RawEntryInfo},
  action: BaseAction,
  calendarQuery: CalendarQuery,
  pollResult: {[id: string]: RawEntryInfo},
  pushResult: {[id: string]: RawEntryInfo},
  lastActionTypes: $ReadOnlyArray<$PropertyType<BaseAction, 'type'>>,
  time: number,
|};

export type CheckStateServerRequest = {|
  type: 6,
  hashesToCheck: {[key: string]: number},
  stateChanges?: $Shape<{|
    rawThreadInfos: RawThreadInfo[],
    rawEntryInfos: RawEntryInfo[],
    currentUserInfo: CurrentUserInfo,
    userInfos: AccountUserInfo[],
  |}>,
|};
type CheckStateClientResponse = {|
  type: 6,
  hashResults: {[key: string]: bool},
|};

type InitialActivityUpdatesClientResponse = {|
  type: 7,
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
|};

export type ServerRequest =
  | PlatformServerRequest
  | DeviceTokenServerRequest
  | PlatformDetailsServerRequest
  | CheckStateServerRequest;
export type ClientResponse =
  | PlatformClientResponse
  | DeviceTokenClientResponse
  | ThreadInconsistencyClientResponse
  | PlatformDetailsClientResponse
  | InitialActivityUpdateClientResponse
  | EntryInconsistencyClientResponse
  | CheckStateClientResponse
  | InitialActivityUpdatesClientResponse;

export const clearDeliveredClientResponsesActionType =
  "CLEAR_DELIVERED_CLIENT_RESPONSES";
export type ClearDeliveredClientResponsesPayload = {|
  clientResponses: $ReadOnlyArray<ClientResponse>,
|};

export const processServerRequestsActionType = "PROCESS_SERVER_REQUESTS";
export type ProcessServerRequestsPayload = {|
  serverRequests: $ReadOnlyArray<ServerRequest>,
|};
