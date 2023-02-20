// @flow

import { mergeUserInfos } from './user-actions.js';
import threadWatcher from '../shared/thread-watcher.js';
import {
  type LogInResult,
  logInActionSources,
} from '../types/account-types.js';
import type { SIWEAuthServerCall } from '../types/siwe-types.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';
import { getConfig } from '../utils/config.js';

const getSIWENonceActionTypes = Object.freeze({
  started: 'GET_SIWE_NONCE_STARTED',
  success: 'GET_SIWE_NONCE_SUCCESS',
  failed: 'GET_SIWE_NONCE_FAILED',
});
const getSIWENonce =
  (callServerEndpoint: CallServerEndpoint): (() => Promise<string>) =>
  async () => {
    const response = await callServerEndpoint('siwe_nonce');
    return response.nonce;
  };

const siweAuthActionTypes = Object.freeze({
  started: 'SIWE_AUTH_STARTED',
  success: 'SIWE_AUTH_SUCCESS',
  failed: 'SIWE_AUTH_FAILED',
});
const siweAuthCallServerEndpointOptions = { timeout: 60000 };
const siweAuth =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((siweAuthPayload: SIWEAuthServerCall) => Promise<LogInResult>) =>
  async siweAuthPayload => {
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
    const userInfos = mergeUserInfos(
      response.userInfos,
      response.cookieChange.userInfos,
    );
    return {
      threadInfos: response.cookieChange.threadInfos,
      currentUserInfo: response.currentUserInfo,
      calendarResult: {
        calendarQuery: siweAuthPayload.calendarQuery,
        rawEntryInfos: response.rawEntryInfos,
      },
      messagesResult: {
        messageInfos: response.rawMessageInfos,
        truncationStatus: response.truncationStatuses,
        watchedIDsAtRequestTime: watchedIDs,
        currentAsOf: response.serverTime,
      },
      userInfos,
      updatesCurrentAsOf: response.serverTime,
      logInActionSource: logInActionSources.logInFromNativeSIWE,
      notAcknowledgedPolicies: response.notAcknowledgedPolicies,
    };
  };

export { getSIWENonceActionTypes, getSIWENonce, siweAuthActionTypes, siweAuth };
