// @flow

import type { $Response, $Request } from 'express';
import type { UserInfo, CurrentUserInfo } from 'lib/types/user-types';
import type { RawThreadInfo } from 'lib/types/thread-types';

import invariant from 'invariant';
import bcrypt from 'twin-bcrypt';
import { URL } from 'url';

import { ServerError } from 'lib/utils/fetch-utils';

import { pool, SQL } from '../database';
import { Viewer } from './viewer';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import urlFacts from '../../facts/url';

const { baseDomain, basePath } = urlFacts;

const cookieLifetime = 30*24*60*60*1000; // in milliseconds
const cookieSource = Object.freeze({
  BODY: 0,
  HEADER: 1,
});
export type CookieSource = $Values<typeof cookieSource>;
const cookieType = Object.freeze({
  USER: "user",
  ANONYMOUS: "anonymous",
});
type CookieType = $Values<typeof cookieType>;

async function fetchUserViewer(cookie: string, source: CookieSource) {
  const [ cookieID, cookiePassword ] = cookie.split(':');
  invariant(cookieID && cookiePassword, `invalid cookie ${cookie}`);
  const query = SQL`
    SELECT hash, user, last_update FROM cookies
    WHERE id = ${cookieID} AND user IS NOT NULL
  `;
  const [ result ] = await pool.query(query);
  const cookieRow = result[0];
  invariant(cookieRow, `invalid user cookie ID ${cookieID}`);
  invariant(
    bcrypt.compareSync(cookiePassword, cookieRow.hash),
    `invalid cookie password for user cookie ID ${cookieID}`,
  );
  invariant(
    cookieRow.last_update + cookieLifetime > Date.now(),
    `user cookie ID ${cookieID} is expired`,
  );
  const userID = cookieRow.user.toString();
  return new Viewer(
    {
      loggedIn: true,
      id: userID,
      userID,
      cookieID,
      cookiePassword,
    },
    source,
  );
}

async function fetchAnonymousViewer(cookie: string, source: CookieSource) {
  const [ cookieID, cookiePassword ] = cookie.split(':');
  invariant(cookieID && cookiePassword, `invalid cookie ${cookie}`);
  const query = SQL`
    SELECT last_update, hash FROM cookies
    WHERE id = ${cookieID} AND user IS NULL
  `;
  const [ result ] = await pool.query(query);
  const cookieRow = result[0];
  invariant(cookieRow, `invalid anonymous cookie ID ${cookieID}`);
  invariant(
    bcrypt.compareSync(cookiePassword, cookieRow.hash),
    `invalid cookie password for anonymous cookie ID ${cookieID}`,
  );
  invariant(
    cookieRow.last_update + cookieLifetime > Date.now(),
    `anonymous cookie ID ${cookieID} is expired`,
  );
  return new Viewer(
    {
      loggedIn: false,
      id: cookieID,
      cookieID,
      cookiePassword,
    },
    source,
  );
}

// This function is meant to consume a cookie that has already been processed.
// That means it doesn't have any logic to handle an invalid cookie, and it
// doesn't the cookie's last_update timestamp.
async function fetchViewerFromCookieData(
  cookieData: {[cookieName: string]: string},
): Promise<?Viewer> {
  if (cookieData.user) {
    return await fetchUserViewer(cookieData.user, cookieSource.HEADER);
  } else if (cookieData.anonymous) {
    return await fetchAnonymousViewer(cookieData.anonymous, cookieSource.HEADER);
  }
  return null;
}

async function fetchViewerFromRequestBody(req: $Request): Promise<?Viewer> {
  const body = (req.body: any);
  const cookiePair = body.cookie;
  if (!cookiePair || !(typeof cookiePair === "string")) {
    return null;
  }
  const [ cookieType, cookie ] = cookiePair.split("=");
  if (cookieType === "user" && cookie) {
    return await fetchUserViewer(cookie, cookieSource.BODY);
  } else if (cookieType === "anonymous" && cookie) {
    return await fetchAnonymousViewer(cookie, cookieSource.BODY);
  }
  return null;
}

async function fetchViewerFromRequest(req: $Request): Promise<Viewer> {
  let viewer = await fetchViewerFromCookieData(req.cookies);
  if (!viewer) {
    viewer = await fetchViewerFromRequestBody(req);
  }
  if (!viewer) {
    throw new ServerError("no_cookie");
  }
  return viewer;
}

type CookieChange = {|
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: $ReadOnlyArray<UserInfo>,
  cookieInvalidated: bool,
  currentUserInfo?: CurrentUserInfo,
  cookie?: string,
|};

async function addCookieChangeInfoToResult(
  viewer: Viewer,
  res: $Response,
  result: Object,
) {
  const cookiePair = cookiePairStringForViewer(viewer);
  const { threadInfos, userInfos } = await fetchThreadInfos(viewer);
  const userInfosArray: any = Object.values(userInfos);
  const cookieChange: CookieChange = {
    threadInfos,
    userInfos: userInfosArray,
    cookieInvalidated: viewer.cookieInvalidated,
  };
  if (viewer.cookieInvalidated) {
    cookieChange.currentUserInfo = {
      id: viewer.cookieID,
      anonymous: true,
    };
  }
  if (viewer.initializationSource === cookieSource.BODY) {
    cookieChange.cookie = cookiePair;
  } else {
    const url = new URL(baseDomain);
    const domain = url.hostname;
    res.cookie(
      viewer.loggedIn ? cookieType.USER : cookieType.ANONYMOUS,
      cookieStringForViewer(viewer),
      {
        maxAge: cookieLifetime,
        domain,
        path: basePath,
        httpOnly: true,
        secure: true,
      },
    );
  }
  result.cookieChange = cookieChange;
}

function cookieStringForViewer(viewer: Viewer) {
  return `${viewer.cookieID}:${viewer.cookiePassword}`;
}

function cookiePairStringForViewer(viewer: Viewer) {
  if (viewer.loggedIn) {
    return `${cookieType.USER}=${cookieStringForViewer(viewer)}`;
  } else {
    return `${cookieType.ANONYMOUS}=${cookieStringForViewer(viewer)}`;
  }
}

export {
  fetchViewerFromRequest,
  addCookieChangeInfoToResult,
};
