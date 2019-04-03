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
import { type ActivityUpdate, activityUpdatePropType } from './activity-types';
import {
  type CurrentUserInfo,
  type AccountUserInfo,
  accountUserInfoPropType,
  currentUserPropType,
} from './user-types';
import type {
  ThreadInconsistencyReportShape,
  EntryInconsistencyReportShape,
  ClientThreadInconsistencyReportShape,
  ClientEntryInconsistencyReportShape,
} from './report-types';

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
  ...ThreadInconsistencyReportShape,
  type: 2,
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
  ...EntryInconsistencyReportShape,
|};

export type CheckStateServerRequest = {|
  type: 6,
  hashesToCheck: {[key: string]: number},
  failUnmentioned?: $Shape<{|
    threadInfos: bool,
    entryInfos: bool,
  |}>,
  stateChanges?: $Shape<{|
    rawThreadInfos: RawThreadInfo[],
    rawEntryInfos: RawEntryInfo[],
    currentUserInfo: CurrentUserInfo,
    userInfos: AccountUserInfo[],
    deleteThreadIDs: string[],
    deleteEntryIDs: string[],
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

// This is just the client variant of ClientResponse. The server needs to handle
// multiple client versions so the type supports old versions of certain client
// responses, but the client variant only need to support the latest version.
export type ClientThreadInconsistencyClientResponse = {|
  ...ClientThreadInconsistencyReportShape,
  type: 2,
|};
export type ClientEntryInconsistencyClientResponse = {|
  type: 5,
  ...ClientEntryInconsistencyReportShape,
|};
export type ClientClientResponse =
  | PlatformClientResponse
  | DeviceTokenClientResponse
  | ClientThreadInconsistencyClientResponse
  | PlatformDetailsClientResponse
  | InitialActivityUpdateClientResponse
  | ClientEntryInconsistencyClientResponse
  | CheckStateClientResponse
  | InitialActivityUpdatesClientResponse;

const actionSummaryPropType = PropTypes.shape({
  type: PropTypes.string.isRequired,
  time: PropTypes.number.isRequired,
  summary: PropTypes.string.isRequired,
});
export const clientResponsePropType = PropTypes.oneOfType([
  PropTypes.shape({
    type: PropTypes.oneOf([ serverRequestTypes.PLATFORM ]).isRequired,
    platform: platformPropType.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ serverRequestTypes.DEVICE_TOKEN ]).isRequired,
    deviceToken: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([
      serverRequestTypes.THREAD_INCONSISTENCY,
    ]).isRequired,
    platformDetails: platformDetailsPropType.isRequired,
    beforeAction: PropTypes.objectOf(rawThreadInfoPropType).isRequired,
    action: PropTypes.object.isRequired,
    pollResult: PropTypes.objectOf(rawThreadInfoPropType).isRequired,
    pushResult: PropTypes.objectOf(rawThreadInfoPropType).isRequired,
    lastActions: PropTypes.arrayOf(actionSummaryPropType).isRequired,
    time: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ serverRequestTypes.PLATFORM_DETAILS ]).isRequired,
    platformDetails: platformDetailsPropType.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ serverRequestTypes.INITIAL_ACTIVITY_UPDATE ]).isRequired,
    threadID: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([
      serverRequestTypes.ENTRY_INCONSISTENCY,
    ]).isRequired,
    platformDetails: platformDetailsPropType.isRequired,
    beforeAction: PropTypes.objectOf(rawEntryInfoPropType).isRequired,
    action: PropTypes.object.isRequired,
    calendarQuery: calendarQueryPropType.isRequired,
    pollResult: PropTypes.objectOf(rawEntryInfoPropType).isRequired,
    pushResult: PropTypes.objectOf(rawEntryInfoPropType).isRequired,
    lastActions: PropTypes.arrayOf(actionSummaryPropType).isRequired,
    time: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ serverRequestTypes.CHECK_STATE ]).isRequired,
    hashResults: PropTypes.objectOf(PropTypes.bool).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([
      serverRequestTypes.INITIAL_ACTIVITY_UPDATES,
    ]).isRequired,
    activityUpdates: PropTypes.arrayOf(activityUpdatePropType).isRequired,
  }),
]);

export type ClientInconsistencyResponse =
  | ClientThreadInconsistencyClientResponse
  | ClientEntryInconsistencyClientResponse;
export type ClearDeliveredReportsPayload = {|
  reports: $ReadOnlyArray<ClientInconsistencyResponse>,
|};

export const processServerRequestsActionType = "PROCESS_SERVER_REQUESTS";
export type ProcessServerRequestsPayload = {|
  serverRequests: $ReadOnlyArray<ServerRequest>,
  calendarQuery: CalendarQuery,
|};
