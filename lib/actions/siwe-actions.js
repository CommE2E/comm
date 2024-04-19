// @flow

import { mergeUserInfos } from './user-actions.js';
import type {
  CallSingleKeyserverEndpoint,
  CallSingleKeyserverEndpointOptions,
} from '../keyserver-conn/call-single-keyserver-endpoint.js';
import threadWatcher from '../shared/thread-watcher.js';
import {
  type LogInResult,
  logInActionSources,
} from '../types/account-types.js';
import type { SIWEAuthServerCall } from '../types/siwe-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { getConfig } from '../utils/config.js';

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

const siweAuthActionTypes = Object.freeze({
  started: 'SIWE_AUTH_STARTED',
  success: 'SIWE_AUTH_SUCCESS',
  failed: 'SIWE_AUTH_FAILED',
});
const siweAuthCallSingleKeyserverEndpointOptions = { timeout: 60000 };
const siweAuth =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((
    siweAuthPayload: SIWEAuthServerCall,
    options?: ?CallSingleKeyserverEndpointOptions,
  ) => Promise<LogInResult>) =>
  async (siweAuthPayload, options) => {
    const watchedIDs = threadWatcher.getWatchedIDs();
    const deviceTokenUpdateRequest =
      siweAuthPayload.deviceTokenUpdateRequest[authoritativeKeyserverID()];
    const { preRequestUserInfo, ...rest } = siweAuthPayload;

    const response = await callSingleKeyserverEndpoint(
      'siwe_auth',
      {
        ...rest,
        watchedIDs,
        deviceTokenUpdateRequest,
        platformDetails: getConfig().platformDetails,
      },
      {
        ...siweAuthCallSingleKeyserverEndpointOptions,
        ...options,
      },
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
        currentAsOf: { [authoritativeKeyserverID()]: response.serverTime },
      },
      userInfos,
      updatesCurrentAsOf: { [authoritativeKeyserverID()]: response.serverTime },
      authActionSource: logInActionSources.logInFromNativeSIWE,
      notAcknowledgedPolicies: response.notAcknowledgedPolicies,
      preRequestUserInfo: null,
    };
  };

export { getSIWENonceActionTypes, getSIWENonce, siweAuthActionTypes, siweAuth };
