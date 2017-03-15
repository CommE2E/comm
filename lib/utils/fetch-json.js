// @flow

import $param from 'jquery-param';
import setCookie from 'set-cookie-parser';
import invariant from 'invariant';
import _map from 'lodash/fp/map';
import _find from 'lodash/fp/find';
import _filter from 'lodash/fp/filter';

import { ServerError } from './fetch-utils';
import { getConfig } from './config';

function parseSetCookieHeader(setCookieHeader: string) {
  // We can't simply split by commas, because the "expires" clause can have a
  // comma in it. We can't simply split by semicolons, since then two clauses
  // from different cookies will appear as one. We can't simply split by equals
  // signs because some clauses (httponly) don't have them. And there isn't a
  // single npm package out there that can handle all of these things without
  // relying on Node.js. What has the world come to?
  const parts = setCookieHeader.split(/(anonymous)|(user)/).filter(a => a);
  invariant(parts.length % 2 === 0, "should be even");
  const cookieMap = {};
  for (let i = 0; i < parts.length; i += 2) {
    cookieMap[parts[i]] = parts[i + 1];
  }
  const individualCookieClauses =
    _map.convert({ cap: false })((value, key) => key + value)(cookieMap);
  return setCookie.parse(individualCookieClauses);
}

// TODO update all createBoundServerCallSelector to bindServerCalls
// TODO make sure no errors occur on web and cookie isn't set
// TODO do we always want to send credentials: same-origin?
// TODO try to type bindServerCalls a bit better (TupleMap?)
// TODO actually trigger a LOG_OUT action when log out is clicked in native
// TODO make sure no cookie headers are actually set when cookie = null

// If cookie is undefined, then we will defer to the underlying environment to
// handle cookies, and we won't worry about them. We do this on the web since
// our cookies are httponly to protect against XSS attacks. On the other hand,
// on native we want to keep track of the cookies since we don't trust the
// underlying implementations and prefer for things to be explicit, and XSS
// isn't a thing on native. Note that for native, cookie might be null
// (indicating we don't have one), and we will then set an empty Cookie header.
async function fetchJSON(
  cookie: ?string,
  setCookieCallback: (newCookie: ?string) => void,
  url: string,
  data: {[key: string]: mixed},
) {
  url = getConfig().urlPrefix + url;
  const headers: {[name: string]: string} = {
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
  };
  if (cookie !== undefined) {
    headers['Cookie'] = cookie ? cookie : "";
  }
  const response = await fetch(url, {
    // Flow gets confused by some enum type, so we need this cast
    'method': ('POST': MethodType),
    // This is necessary to allow cookie headers to get passed down to us
    'credentials': 'same-origin',
    'body': $param(data),
    headers,
  });

  const setCookieHeader = response.headers.get('Set-Cookie');
  if (setCookieHeader) {
    const cookies = parseSetCookieHeader(setCookieHeader);
    const now = new Date();
    const activeCookies = _filter((cookie) => cookie.expires > now)(cookies);
    const userCookie = _find(['name', 'user'])(activeCookies);
    if (userCookie) {
      setCookieCallback("user=" + userCookie.value);
    } else {
      const anonymousCookie = _find(['name', 'anonymous'])(activeCookies);
      if (anonymousCookie) {
        setCookieCallback("anonymous=" + anonymousCookie.value);
      }
    }
  }

  const json = await response.json();
  console.log(json);
  if (json.error) {
    throw new ServerError(json.error, json);
  }
  return json;
}

export type FetchJSON = (url: string, data: Object) => Promise<Object>;

export default fetchJSON;
