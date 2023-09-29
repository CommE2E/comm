// @flow

import { mergeUserInfos } from './user-actions.js';
import threadWatcher from '../shared/thread-watcher.js';
import {
  type LogInResult,
  type IdentityServiceOlmAuthServerCall,
} from '../types/account-types.js';
import type {
  CallServerEndpoint,
  CallServerEndpointOptions,
} from '../utils/call-server-endpoint.js';
import { getConfig } from '../utils/config.js';

const identityServiceOlmAuthActionTypes = Object.freeze({
  started: 'IDENTITY_SERVICE_OLM_AUTH_STARTED',
  success: 'IDENTITY_SERVICE_OLM_AUTH_SUCCESS',
  failed: 'IDENTITY_SERVICE_OLM_AUTH_FAILED',
});
const identityServiceOlmAuthCallServerEndpointOptions = { timeout: 60000 };
const identityServiceOlmAuth =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    identityServiceOlmAuthPayload: IdentityServiceOlmAuthServerCall,
    options?: ?CallServerEndpointOptions,
  ) => Promise<LogInResult>) =>
  async (identityServiceOlmAuthPayload, options) => {
    const watchedIDs = threadWatcher.getWatchedIDs();
    const response = await callServerEndpoint(
      'identity_service_olm_auth',
      {
        ...identityServiceOlmAuthPayload,
        watchedIDs,
        platformDetails: getConfig().platformDetails,
      },
      {
        ...identityServiceOlmAuthCallServerEndpointOptions,
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
        calendarQuery: identityServiceOlmAuthPayload.calendarQuery,
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
      logInActionSource: identityServiceOlmAuthPayload.logInActionSource,
      notAcknowledgedPolicies: response.notAcknowledgedPolicies,
    };
  };

export { identityServiceOlmAuthActionTypes, identityServiceOlmAuth };
