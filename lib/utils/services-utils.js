// @flow

import base64 from 'base-64';

import { getMessageForException } from './errors.js';
import type { AuthMetadata } from '../shared/identity-client-context.js';

// If this is true, then the app is able to support multiple keyservers. This
// requires the use of Tunnelbroker and the backup service to persist and sync
// the KeyserverStore.
const supportingMultipleKeyservers = false;

// If this is false, then the app no longer needs to rely on being connected to
// an authoritative keyserver for things like DMs.
const relyingOnAuthoritativeKeyserver = true;

// If this returns true, then we're using the login 2.0, which means that a user
// can either restore an account (primary login) or log in using the QR code
// (secondary login).
function useIsRestoreFlowEnabled(): boolean {
  return true;
}

// If this is true, then the app is able to support User Data backup. After
// restoring or secondary device login, the app will attempt to download
// and apply compaction and logs. App is able to generate and upload
// compaction and logs.
// Keep in sync with native/cpp/CommonCpp/Tools/ServicesUtils.h
const fullBackupSupport = false;

function createHTTPAuthorizationHeader(authMetadata: AuthMetadata): string {
  // explicit destructure to make it future-proof
  const { userID, deviceID, accessToken } = authMetadata;
  const payload = JSON.stringify({ userID, deviceID, accessToken });
  const base64EncodedPayload = base64.encode(payload);
  return `Bearer ${base64EncodedPayload}`;
}

function createDefaultHTTPRequestHeaders(authMetadata: AuthMetadata): {
  [string]: string,
} {
  const authorization = createHTTPAuthorizationHeader(authMetadata);
  return {
    Authorization: authorization,
  };
}

function httpResponseIsInvalidCSAT(response: Response): boolean {
  const { status } = response;
  return status === 401 || status === 403;
}

function errorMessageIsInvalidCSAT(exception: mixed): boolean {
  const errorMessage = getMessageForException(exception);
  return errorMessage === 'invalid_csat';
}

export {
  supportingMultipleKeyservers,
  relyingOnAuthoritativeKeyserver,
  useIsRestoreFlowEnabled,
  createHTTPAuthorizationHeader,
  createDefaultHTTPRequestHeaders,
  httpResponseIsInvalidCSAT,
  errorMessageIsInvalidCSAT,
  fullBackupSupport,
};
