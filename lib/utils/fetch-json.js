// @flow

import type { Endpoint } from '../types/endpoints';

import invariant from 'invariant';
import _map from 'lodash/fp/map';
import _find from 'lodash/fp/find';
import _filter from 'lodash/fp/filter';

import { ServerError, FetchTimeout } from './errors';
import { getConfig } from './config';
import sleep from './sleep';

// You'll notice that this is not the type of the fetchJSON function below. This
// is because the first several parameters to that functon get bound in by the
// helpers in lib/utils/action-utils.js. This type represents the form of the
// fetchJSON function that gets passed to the action function in lib/actions.
export type FetchJSON = (endpoint: Endpoint, input: Object) => Promise<Object>;

// If cookie is undefined, then we will defer to the underlying environment to
// handle cookies, and we won't worry about them. We do this on the web since
// our cookies are httponly to protect against XSS attacks. On the other hand,
// on native we want to keep track of the cookies since we don't trust the
// underlying implementations and prefer for things to be explicit, and XSS
// isn't a thing on native. Note that for native, cookie might be null
// (indicating we don't have one), and we will then set an empty Cookie header.
async function fetchJSON(
  cookie: ?string,
  setCookieCallback: (newCookie: ?string, response: Object) => void,
  waitIfCookieInvalidated: () => Promise<?FetchJSON>,
  cookieInvalidationRecovery:
    (newAnonymousCookie: ?string) => Promise<?FetchJSON>,
  urlPrefix: string,
  endpoint: Endpoint,
  input: {[key: string]: mixed},
) {
  const possibleReplacement = await waitIfCookieInvalidated();
  if (possibleReplacement) {
    return await possibleReplacement(endpoint, input);
  }

  const definedCookie = cookie ? cookie : null;
  const mergedData = getConfig().setCookieOnRequest
    ? { input, cookie: definedCookie }
    : { input };
  const url = urlPrefix ? `${urlPrefix}/${endpoint}` : endpoint;
  const fetchPromise = fetch(url, {
    // Flow gets confused by some enum type, so we need this cast
    'method': 'POST',
    // This is necessary to allow cookie headers to get passed down to us
    'credentials': 'same-origin',
    'body': JSON.stringify(mergedData),
    'headers': {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const rejectPromise = (async () => {
    await sleep(10000);
    throw new FetchTimeout(`fetchJSON timed out call to ${endpoint}`, endpoint);
  })();
  const response = await Promise.race([ fetchPromise, rejectPromise ]);
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.log(text);
    throw e;
  }

  const getNewCookie = getConfig().getNewCookie;
  if (getNewCookie) {
    const newCookie = await getNewCookie(json);
    if (newCookie) {
      if (json.cookieChange && json.cookieChange.cookieInvalidated) {
        const possibleReplacement = await cookieInvalidationRecovery(newCookie);
        if (possibleReplacement) {
          return await possibleReplacement(endpoint, input);
        }
      }
      setCookieCallback(newCookie, json);
    }
  }

  if (json.error) {
    throw new ServerError(json.error, json.payload);
  }
  return json;
}

export default fetchJSON;
