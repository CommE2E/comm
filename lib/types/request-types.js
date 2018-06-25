// @flow

import type { Platform } from './device-types';
import type { RawThreadInfo } from './thread-types';
import type { BaseAction } from './redux-types';

import invariant from 'invariant';
import PropTypes from 'prop-types';

// "Server requests" are requests for information that the server delivers to
// clients. Clients then respond to those requests with a "client response".
export const serverRequestTypes = Object.freeze({
  PLATFORM: 0,
  DEVICE_TOKEN: 1,
  THREAD_POLL_PUSH_INCONSISTENCY: 2,
});
type ServerRequestType = $Values<typeof serverRequestTypes>;
function assertServerRequestType(
  serverRequestType: number,
): ServerRequestType {
  invariant(
    serverRequestType === 0 ||
      serverRequestType === 1 ||
      serverRequestType === 2,
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

export type ThreadPollPushInconsistencyClientResponse = {|
  type: 2,
  beforeAction: {[id: string]: RawThreadInfo},
  action: BaseAction,
  pollResult: {[id: string]: RawThreadInfo},
  pushResult: {[id: string]: RawThreadInfo},
|};

export const serverRequestPropType = PropTypes.oneOfType([
  PropTypes.shape({
    type: PropTypes.oneOf([ serverRequestTypes.PLATFORM ]).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ serverRequestTypes.DEVICE_TOKEN ]).isRequired,
  }),
]);

export type ServerRequest =
  | PlatformServerRequest
  | DeviceTokenServerRequest;
export type ClientResponse =
  | PlatformClientResponse
  | DeviceTokenClientResponse
  | ThreadPollPushInconsistencyClientResponse;
