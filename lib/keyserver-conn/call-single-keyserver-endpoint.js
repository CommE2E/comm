// @flow

import _isEqual from 'lodash/fp/isEqual.js';

import {
  defaultPerformHTTPMultipartUpload,
  type PerformHTTPMultipartUpload,
} from './multipart-upload.js';
import { updateLastCommunicatedPlatformDetailsActionType } from '../actions/device-actions.js';
import { callSingleKeyserverEndpointTimeout } from '../shared/timeouts.js';
import type { PlatformDetails } from '../types/device-types.js';
import {
  type Endpoint,
  type SocketAPIHandler,
  endpointIsSocketPreferred,
  endpointIsSocketOnly,
} from '../types/endpoints.js';
import { forcePolicyAcknowledgmentActionType } from '../types/policy-types.js';
import type { Dispatch } from '../types/redux-types.js';
import type {
  ServerSessionChange,
  ClientSessionChange,
} from '../types/session-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';
import { getConfig } from '../utils/config.js';
import {
  ServerError,
  FetchTimeout,
  SocketOffline,
  SocketTimeout,
} from '../utils/errors.js';
import sleep from '../utils/sleep.js';
import { extractAndPersistUserInfosFromEndpointResponse } from '../utils/user-info-extraction-utils.js';

export type CallSingleKeyserverEndpointOptions = Partial<{
  // null timeout means no timeout, which is the default for
  // defaultPerformHTTPMultipartUpload
  +timeout: ?number, // in milliseconds
  +performHTTPMultipartUpload: boolean | PerformHTTPMultipartUpload,
  // onProgress and abortHandler only work with performHTTPMultipartUpload
  +onProgress: (percent: number) => void,
  // abortHandler will receive an abort function once the upload starts
  +abortHandler: (abort: () => void) => void,
  // Overrides urlPrefix in Redux
  +urlPrefixOverride: string,
}>;

export type CallSingleKeyserverEndpointResponse = Partial<{
  +cookieChange: ServerSessionChange,
  +currentUserInfo: CurrentUserInfo,
  +error: string,
  +payload: Object,
}>;

// You'll notice that this is not the type of the callSingleKeyserverEndpoint
// function below. This is because the first several parameters to that
// function get bound in by the helpers in legacy-keyserver-call.js
// This type represents the form of the callSingleKeyserverEndpoint function
// that gets passed to the action functions in lib/actions.
export type CallSingleKeyserverEndpoint = (
  endpoint: Endpoint,
  input: Object,
  options?: ?CallSingleKeyserverEndpointOptions,
) => Promise<Object>;

type RequestData = {
  input: { +[key: string]: mixed },
  cookie?: ?string,
  sessionID?: ?string,
  platformDetails?: PlatformDetails,
};

async function callSingleKeyserverEndpoint(
  cookie: ?string,
  setNewSession: (sessionChange: ClientSessionChange, error: ?string) => void,
  waitIfCookieInvalidated: () => Promise<?CallSingleKeyserverEndpoint>,
  cookieInvalidationRecovery: (
    sessionChange: ClientSessionChange,
    error: ?string,
  ) => Promise<?CallSingleKeyserverEndpoint>,
  urlPrefix: string,
  sessionID: ?string,
  isSocketConnected: boolean,
  lastCommunicatedPlatformDetails: ?PlatformDetails,
  socketAPIHandler: ?SocketAPIHandler,
  endpoint: Endpoint,
  input: { +[key: string]: mixed },
  dispatch: Dispatch,
  options?: ?CallSingleKeyserverEndpointOptions,
  loggedIn: boolean,
  keyserverID: string,
): Promise<Object> {
  const possibleReplacement = await waitIfCookieInvalidated();
  if (possibleReplacement) {
    return await possibleReplacement(endpoint, input, options);
  }

  const shouldSendPlatformDetails =
    lastCommunicatedPlatformDetails &&
    !_isEqual(lastCommunicatedPlatformDetails)(getConfig().platformDetails);

  if (
    endpointIsSocketPreferred(endpoint) &&
    isSocketConnected &&
    socketAPIHandler &&
    !options?.urlPrefixOverride
  ) {
    try {
      return socketAPIHandler({ endpoint, input });
    } catch (e) {
      if (endpointIsSocketOnly(endpoint)) {
        throw e;
      } else if (e instanceof SocketOffline) {
        // nothing
      } else if (e instanceof SocketTimeout) {
        // nothing
      } else {
        throw e;
      }
    }
  }
  if (endpointIsSocketOnly(endpoint)) {
    throw new SocketOffline('socket_offline');
  }

  const resolvedURLPrefix = options?.urlPrefixOverride ?? urlPrefix;
  const url = resolvedURLPrefix ? `${resolvedURLPrefix}/${endpoint}` : endpoint;

  let json;
  if (options && options.performHTTPMultipartUpload) {
    const performHTTPMultipartUpload =
      typeof options.performHTTPMultipartUpload === 'function'
        ? options.performHTTPMultipartUpload
        : defaultPerformHTTPMultipartUpload;
    json = await performHTTPMultipartUpload(
      url,
      cookie,
      sessionID,
      input,
      options,
    );
  } else {
    const mergedData: RequestData = { input };
    mergedData.cookie = cookie ? cookie : null;

    if (getConfig().setSessionIDOnRequest) {
      // We make sure that if setSessionIDOnRequest is true, we never set
      // sessionID to undefined. null has a special meaning here: we cannot
      // consider the cookieID to be a unique session identifier, but we do not
      // have a sessionID to use either. This should only happen when the user
      // is not logged in on web.
      mergedData.sessionID = sessionID ? sessionID : null;
    }
    if (shouldSendPlatformDetails) {
      mergedData.platformDetails = getConfig().platformDetails;
    }
    const callEndpointPromise =
      (async (): Promise<CallSingleKeyserverEndpointResponse> => {
        const response = await fetch(url, {
          method: 'POST',
          // This is necessary to allow cookie headers to get passed down to us
          credentials: 'same-origin',
          body: JSON.stringify(mergedData),
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          console.log(text);
          throw e;
        }
      })();

    const timeout =
      options && options.timeout
        ? options.timeout
        : callSingleKeyserverEndpointTimeout;
    if (!timeout) {
      json = await callEndpointPromise;
    } else {
      const rejectPromise = (async () => {
        await sleep(timeout);
        throw new FetchTimeout(
          `callSingleKeyserverEndpoint timed out call to ${endpoint}`,
          endpoint,
        );
      })();
      json = await Promise.race([callEndpointPromise, rejectPromise]);
    }
  }
  extractAndPersistUserInfosFromEndpointResponse(json, endpoint, dispatch);

  const { cookieChange, error, payload, currentUserInfo } = json;
  const sessionChange: ?ServerSessionChange = cookieChange;
  if (sessionChange) {
    const { threadInfos, userInfos, ...rest } = sessionChange;
    const clientSessionChange = rest.cookieInvalidated
      ? rest
      : { cookieInvalidated: false, currentUserInfo, ...rest };
    if (clientSessionChange.cookieInvalidated) {
      const maybeReplacement = await cookieInvalidationRecovery(
        clientSessionChange,
        error,
      );
      if (maybeReplacement) {
        return await maybeReplacement(endpoint, input, options);
      }
    } else {
      // We don't want to call setNewSession when cookieInvalidated. If the
      // cookie is invalidated, the cookieInvalidationRecovery call above will
      // either trigger a invalidation recovery attempt (if supported), or it
      // will call setNewSession itself. If the invalidation recovery is
      // attempted, it will result in a setNewSession call when it concludes.
      setNewSession(clientSessionChange, error);
    }
  }

  if (!error && shouldSendPlatformDetails) {
    dispatch({
      type: updateLastCommunicatedPlatformDetailsActionType,
      payload: { platformDetails: getConfig().platformDetails, keyserverID },
    });
  }

  if (error === 'policies_not_accepted' && loggedIn) {
    dispatch({
      type: forcePolicyAcknowledgmentActionType,
      payload,
    });
  }
  if (error) {
    throw new ServerError(error, payload);
  }
  return json;
}

export default callSingleKeyserverEndpoint;
