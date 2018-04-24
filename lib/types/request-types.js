// @flow

import type { Platform } from './device-types';

import invariant from 'invariant';
import PropTypes from 'prop-types';

// "Server requests" are requests for information that the server delivers to
// clients. Clients then respond to those requests with a "client response".
export const serverRequestTypes = Object.freeze({
  PLATFORM: 0,
  DEVICE_TOKEN: 1,
});
export type ServerRequestType = $Values<typeof serverRequestTypes>;
export function assertServerRequestType(
  serverRequestType: number,
): ServerRequestType {
  invariant(
    serverRequestType === 0 ||
      serverRequestType === 1,
    "number is not ServerRequestType enum",
  );
  return serverRequestType;
}

export type PlatformServerRequest = {|
  type: 0,
|};
export type PlatformClientResponse = {|
  type: 0,
  platform: Platform,
|};

export type DeviceTokenServerRequest = {|
  type: 1,
|};
export type DeviceTokenClientResponse = {|
  type: 1,
  deviceToken: string,
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
  | DeviceTokenClientResponse;
