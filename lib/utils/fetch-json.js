// @flow

import $param from 'jquery-param';
import invariant from 'invariant';
import _map from 'lodash/fp/map';
import _find from 'lodash/fp/find';
import _filter from 'lodash/fp/filter';

import { ServerError } from './fetch-utils';
import { getConfig } from './config';

// You'll notice that this is not the type of the fetchJSON function below. This
// is because the first several parameters to that functon get bound in by the
// helpers in lib/utils/action-utils.js. This type represents the form of the
// fetchJSON function that gets passed to the action function in lib/actions.
export type FetchJSON = (url: string, data: Object) => Promise<Object>;

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
  url: string,
  data: {[key: string]: mixed},
) {
  const possibleReplacement = await waitIfCookieInvalidated();
  if (possibleReplacement) {
    return await possibleReplacement(url, data);
  }

  const mergedData = { ...data, cookie };
  const prefixedURL = getConfig().urlPrefix + url;
  const response = await fetch(prefixedURL, {
    // Flow gets confused by some enum type, so we need this cast
    'method': ('POST': MethodType),
    // This is necessary to allow cookie headers to get passed down to us
    'credentials': 'same-origin',
    'body': $param(mergedData),
    'headers': {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
  });
  const json = await response.json();
  //console.log(json);

  const getNewCookie = getConfig().getNewCookie;
  if (getNewCookie) {
    const newCookie = await getNewCookie(json);
    if (newCookie) {
      if (json.cookie_change && json.cookie_change.cookie_invalidated) {
        const possibleReplacement = await cookieInvalidationRecovery(newCookie);
        if (possibleReplacement) {
          return await possibleReplacement(url, data);
        }
      }
      setCookieCallback(newCookie, json);
    }
  }

  if (json.error) {
    throw new ServerError(json.error, json);
  }
  return json;
}

export default fetchJSON;
