// @flow

import invariant from 'invariant';
import _throttle from 'lodash/throttle';

import type {
  CallServerEndpointOptions,
  CallServerEndpointResponse,
} from './call-server-endpoint';
import { getConfig } from './config';

function uploadBlob(
  url: string,
  cookie: ?string,
  sessionID: ?string,
  input: { [key: string]: mixed },
  options?: ?CallServerEndpointOptions,
): Promise<CallServerEndpointResponse> {
  const formData = new FormData();
  if (getConfig().setCookieOnRequest) {
    // We make sure that if setCookieOnRequest is true, we never set cookie to
    // undefined. null has a special meaning here: we don't currently have a
    // cookie, and we want the server to specify the new cookie it will generate
    // in the response body rather than the response header. See
    // session-types.js for more details on why we specify cookies in the body.
    formData.append('cookie', cookie ? cookie : '');
  }
  if (getConfig().setSessionIDOnRequest) {
    // We make sure that if setSessionIDOnRequest is true, we never set
    // sessionID to undefined. null has a special meaning here: we cannot
    // consider the cookieID to be a unique session identifier, but we do not
    // have a sessionID to use either. This should only happen when the user is
    // not logged in on web.
    formData.append('sessionID', sessionID ? sessionID : '');
  }

  for (const key in input) {
    if (key === 'multimedia' || key === 'cookie' || key === 'sessionID') {
      continue;
    }
    const value = input[key];
    invariant(
      typeof value === 'string',
      'blobUpload calls can only handle string values for non-multimedia keys',
    );
    formData.append(key, value);
  }
  const { multimedia } = input;
  if (multimedia && Array.isArray(multimedia)) {
    for (const media of multimedia) {
      // We perform an any-cast here because of React Native. Though Blob
      // support was introduced in react-native@0.54, it isn't compatible with
      // FormData. Instead, React Native requires a specific object format.
      formData.append('multimedia', (media: any));
    }
  }

  const xhr = new XMLHttpRequest();
  xhr.open('POST', url);
  xhr.withCredentials = true;
  xhr.setRequestHeader('Accept', 'application/json');

  if (options && options.timeout) {
    xhr.timeout = options.timeout;
  }

  if (options && options.onProgress) {
    const { onProgress } = options;
    xhr.upload.onprogress = _throttle(
      ({ loaded, total }) => onProgress(loaded / total),
      50,
    );
  }

  let failed = false;
  const responsePromise = new Promise((resolve, reject) => {
    xhr.onload = () => {
      if (failed) {
        return;
      }
      const text = xhr.responseText;
      try {
        resolve(JSON.parse(text));
      } catch (e) {
        console.log(text);
        reject(e);
      }
    };
    xhr.onabort = () => {
      failed = true;
      reject(new Error('request aborted'));
    };
    xhr.onerror = event => {
      failed = true;
      reject(event);
    };
    if (options && options.timeout) {
      xhr.ontimeout = event => {
        failed = true;
        reject(event);
      };
    }
    if (options && options.abortHandler) {
      options.abortHandler(() => {
        failed = true;
        reject(new Error('request aborted'));
        xhr.abort();
      });
    }
  });

  if (!failed) {
    xhr.send(formData);
  }

  return responsePromise;
}

export type UploadBlob = typeof uploadBlob;

export { uploadBlob };
