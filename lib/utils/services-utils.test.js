// @flow

import base64 from 'base-64';

import { createHTTPAuthorizationHeader } from './services-utils.js';

describe('createHTTPAuthorizationHeader', () => {
  it('should return a Bearer token with base64-encoded payload', () => {
    const authMetadata = {
      userID: 'foo',
      deviceID: 'bar',
      accessToken: 'baz',
    };
    const expectedHeader = `Bearer ${base64.encode(
      JSON.stringify(authMetadata),
    )}`;

    const result = createHTTPAuthorizationHeader(authMetadata);
    expect(result).toBe(expectedHeader);
  });
});
