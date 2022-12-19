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
  const nonce = await callServerEndpoint('siwe_nonce');
  return nonce;
};

export { getSIWENonceActionTypes, getSIWENonce };
