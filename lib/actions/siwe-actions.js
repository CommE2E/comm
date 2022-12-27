// @flow

import threadWatcher from '../shared/thread-watcher.js';
import type { SIWEAuthServerCall } from '../types/siwe-types.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint';
import { getConfig } from '../utils/config.js';

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
const siweAuthCallServerEndpointOptions = { timeout: 60000 };
const siweAuth = (
  callServerEndpoint: CallServerEndpoint,
): ((
  siweAuthPayload: SIWEAuthServerCall,
) => Promise<boolean>) => async siweAuthPayload => {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const response = await callServerEndpoint(
    'siwe_auth',
    {
      ...siweAuthPayload,
      watchedIDs,
      platformDetails: getConfig().platformDetails,
    },
    siweAuthCallServerEndpointOptions,
  );
  return response;
};

export { getSIWENonceActionTypes, getSIWENonce, siweAuthActionTypes, siweAuth };
