// @flow

import type { CallServerEndpoint } from '../utils/call-server-endpoint';

const getSIWENonceActionTypes = Object.freeze({
  started: 'GET_SIWE_NONCE_STARTED',
  success: 'GET_SIWE_NONCE_SUCCESS',
  failed: 'GET_SIWE_NONCE_FAILED',
});
const getSIWENonce = (
  callServerEndpoint: CallServerEndpoint,
): (() => Promise<string>) => async () => {
  const response = await callServerEndpoint('siwe_nonce');
  return response.nonce;
};

const siweAuthActionTypes = Object.freeze({
  started: 'SIWE_AUTH_STARTED',
  success: 'SIWE_AUTH_SUCCESS',
  failed: 'SIWE_AUTH_FAILED',
});
const siweAuth = (
  callServerEndpoint: CallServerEndpoint,
): (() => Promise<string>) => async () => {
  const response = await callServerEndpoint('siwe_auth');
  return response;
};

export { getSIWENonceActionTypes, getSIWENonce, siweAuthActionTypes, siweAuth };
