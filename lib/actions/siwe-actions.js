// @flow

import type { CallSingleKeyserverEndpoint } from '../keyserver-conn/call-single-keyserver-endpoint.js';

const getSIWENonceActionTypes = Object.freeze({
  started: 'GET_SIWE_NONCE_STARTED',
  success: 'GET_SIWE_NONCE_SUCCESS',
  failed: 'GET_SIWE_NONCE_FAILED',
});
const getSIWENonce =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): (() => Promise<string>) =>
  async () => {
    const response = await callSingleKeyserverEndpoint('siwe_nonce');
    return response.nonce;
  };

export { getSIWENonceActionTypes, getSIWENonce };
