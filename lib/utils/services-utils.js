// @flow

import base64 from 'base-64';

import type { AuthMetadata } from '../shared/identity-client-context.js';

const usingCommServicesAccessToken = true;

function handleHTTPResponseError(response: Response): void {
  if (!response.ok) {
    const { status, statusText } = response;
    throw new Error(`Server responded with HTTP ${status}: ${statusText}`);
  }
}

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

export {
  handleHTTPResponseError,
  usingCommServicesAccessToken,
  createHTTPAuthorizationHeader,
  createDefaultHTTPRequestHeaders,
};
