// @flow

import type { AuthMetadata } from '../shared/identity-client-context.js';

const usingCommServicesAccessToken = false;

function handleHTTPResponseError(response: Response): void {
  if (!response.ok) {
    const { status, statusText } = response;
    throw new Error(`Server responded with HTTP ${status}: ${statusText}`);
  }
}

function createHTTPAuthorizationHeader(
  authMetadata: AuthMetadata,
  // base64 encode function is platform-specific
  base64EncodeFunction: string => string = btoa,
): string {
  // explicit destructure to make it future-proof
  const { userID, deviceID, accessToken } = authMetadata;
  const payload = JSON.stringify({ userID, deviceID, accessToken });
  const base64EncodedPayload = base64EncodeFunction(payload);
  return `Bearer ${base64EncodedPayload}`;
}

function createDefaultHTTPRequestHeaders(
  authMetadata: AuthMetadata,
  base64EncodeFunction: string => string = btoa,
): { [string]: string } {
  const authorization = createHTTPAuthorizationHeader(
    authMetadata,
    base64EncodeFunction,
  );
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
