// @flow

import { getConfig } from './config.js';
import { ServerError, FetchTimeout } from './errors.js';
import sleep from './sleep.js';
import { uploadBlob, type UploadBlob } from './upload-blob.js';
import { callServerEndpointTimeout } from '../shared/timeouts.js';
import { SocketOffline, SocketTimeout } from '../socket/inflight-requests.js';
import type { Shape } from '../types/core.js';
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
import type { ConnectionStatus } from '../types/socket-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

export type CallServerEndpointOptions = Shape<{
  // null timeout means no timeout, which is the default for uploadBlob
  +timeout: ?number, // in milliseconds
  // getResultInfo will be called right before callServerEndpoint successfully
  // resolves and includes additional information about the request
  +getResultInfo: (resultInfo: CallServerEndpointResultInfo) => mixed,
  +blobUpload: boolean | UploadBlob,
  // the rest (onProgress, abortHandler) only work with blobUpload
  +onProgress: (percent: number) => void,
  // abortHandler will receive an abort function once the upload starts
  +abortHandler: (abort: () => void) => void,
}>;

export type CallServerEndpointResultInfoInterface = 'socket' | 'REST';
export type CallServerEndpointResultInfo = {
  +interface: CallServerEndpointResultInfoInterface,
};

export type CallServerEndpointResponse = Shape<{
  +cookieChange: ServerSessionChange,
  +currentUserInfo: CurrentUserInfo,
  +error: string,
  +payload: Object,
}>;

// You'll notice that this is not the type of the callServerEndpoint
// function below. This is because the first several parameters to that
// function get bound in by the helpers in lib/utils/action-utils.js.
// This type represents the form of the callServerEndpoint function that
// gets passed to the action function in lib/actions.
export type CallServerEndpoint = (
  endpoint: Endpoint,
  input: Object,
  options?: ?CallServerEndpointOptions,
) => Promise<Object>;

type RequestData = {
  input: { [key: string]: mixed },
  cookie?: ?string,
  sessionID?: ?string,
};

// If cookie is undefined, then we will defer to the underlying environment to
// handle cookies, and we won't worry about them. We do this on the web since
// our cookies are httponly to protect against XSS attacks. On the other hand,
// on native we want to keep track of the cookies since we don't trust the
// underlying implementations and prefer for things to be explicit, and XSS
// isn't a thing on native. Note that for native, cookie might be null
// (indicating we don't have one), and we will then set an empty Cookie header.
async function callServerEndpoint(
  cookie: ?string,
  setNewSession: (sessionChange: ClientSessionChange, error: ?string) => void,
  waitIfCookieInvalidated: () => Promise<?CallServerEndpoint>,
  cookieInvalidationRecovery: (
    sessionChange: ClientSessionChange,
  ) => Promise<?CallServerEndpoint>,
  urlPrefix: string,
  sessionID: ?string,
  connectionStatus: ConnectionStatus,
  socketAPIHandler: ?SocketAPIHandler,
  endpoint: Endpoint,
  input: { [key: string]: mixed },
  dispatch: Dispatch,
  options?: ?CallServerEndpointOptions,
): Promise<Object> {
  const possibleReplacement = await waitIfCookieInvalidated();
  if (possibleReplacement) {
    return await possibleReplacement(endpoint, input, options);
  }

  if (
    endpointIsSocketPreferred(endpoint) &&
    connectionStatus === 'connected' &&
    socketAPIHandler
  ) {
    try {
      const result = await socketAPIHandler({ endpoint, input });
      options?.getResultInfo?.({ interface: 'socket' });
      return result;
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

  const url = urlPrefix ? `${urlPrefix}/${endpoint}` : endpoint;

  let json;
  if (options && options.blobUpload) {
    const uploadBlobCallback =
      typeof options.blobUpload === 'function'
        ? options.blobUpload
        : uploadBlob;
    json = await uploadBlobCallback(url, cookie, sessionID, input, options);
  } else {
    const mergedData: RequestData = { input };
    if (getConfig().setCookieOnRequest) {
      // We make sure that if setCookieOnRequest is true, we never set cookie to
      // undefined. null has a special meaning here: we don't currently have a
      // cookie, and we want the server to specify the new cookie it will
      // generate in the response body rather than the response header. See
      // session-types.js for more details on why we specify cookies in the body
      mergedData.cookie = cookie ? cookie : null;
    }
    if (getConfig().setSessionIDOnRequest) {
      // We make sure that if setSessionIDOnRequest is true, we never set
      // sessionID to undefined. null has a special meaning here: we cannot
      // consider the cookieID to be a unique session identifier, but we do not
      // have a sessionID to use either. This should only happen when the user
      // is not logged in on web.
      mergedData.sessionID = sessionID ? sessionID : null;
    }
    const callEndpointPromise =
      (async (): Promise<CallServerEndpointResponse> => {
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
      options && options.timeout ? options.timeout : callServerEndpointTimeout;
    if (!timeout) {
      json = await callEndpointPromise;
    } else {
      const rejectPromise = (async () => {
        await sleep(timeout);
        throw new FetchTimeout(
          `callServerEndpoint timed out call to ${endpoint}`,
          endpoint,
        );
      })();
      json = await Promise.race([callEndpointPromise, rejectPromise]);
    }
  }

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
      );
      if (maybeReplacement) {
        return await maybeReplacement(endpoint, input, options);
      }
    }
    setNewSession(clientSessionChange, error);
  }

  if (error === 'policies_not_accepted') {
    dispatch({
      type: forcePolicyAcknowledgmentActionType,
      payload,
    });
    return undefined;
  } else if (error) {
    throw new ServerError(error, payload);
  }
  options?.getResultInfo?.({ interface: 'REST' });
  return json;
}

export default callServerEndpoint;
