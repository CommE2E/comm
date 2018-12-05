// @flow

import invariant from 'invariant';

import { getConfig } from './config';

function uploadBlob(
  url: string,
  cookie: ?string,
  sessionID: ?string,
  input: {[key: string]: mixed},
): Promise<*> {
  const formData = new FormData();
  if (getConfig().setCookieOnRequest) {
    // We make sure that if setCookieOnRequest is true, we never set cookie to
    // undefined. null has a special meaning here: we don't currently have a
    // cookie, and we want the server to specify the new cookie it will generate
    // in the response body rather than the response header. See
    // session-types.js for more details on why we specify cookies in the body.
    formData.append('cookie', cookie ? cookie : "");
  }
  if (getConfig().setSessionIDOnRequest) {
    // We make sure that if setSessionIDOnRequest is true, we never set
    // sessionID to undefined. null has a special meaning here: we cannot
    // consider the cookieID to be a unique session identifier, but we do not
    // have a sessionID to use either. This should only happen when the user is
    // not logged in on web.
    formData.append('sessionID', sessionID ? sessionID : "");
  }

  for (let key in input) {
    if (key === "multimedia") {
      continue;
    }
    const value = input[key];
    invariant(
      typeof value === "string",
      "blobUpload calls can only handle string values for non-multimedia keys",
    );
    formData.append(key, value);
  }
  const { multimedia } = input;
  if (multimedia && Array.isArray(multimedia)) {
    for (let media of multimedia) {
      // We perform an any-cast here because of React Native. Though Blob
      // support was introduced in react-native@0.54, it isn't compatible with
      // FormData. Instead, React Native requires a specific object format.
      formData.append('multimedia', (media: any));
    }
  }

  return fetch(url, {
    method: 'POST',
    // This is necessary to allow cookie headers to get passed down to us
    credentials: 'same-origin',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });
}

export {
  uploadBlob,
};
