// @flow

import type { Platform } from './device-types';

import invariant from 'invariant';

// "Server requests" are requests for information that the server delivers to
// clients. Clients then respond to those requests with a "client response".
export const serverRequestTypes = Object.freeze({
  PLATFORM: 0,
});
export type ServerRequestType = $Values<typeof serverRequestTypes>;
export function assertServerRequestType(
  serverRequestType: number,
): ServerRequestType {
  invariant(
    serverRequestType === 0,
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

export type ServerRequest = PlatformServerRequest;
export type ClientResponse = PlatformClientResponse;
