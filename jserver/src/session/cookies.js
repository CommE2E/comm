// @flow

import type { $Response, $Request } from 'express';
import type { UserInfo, CurrentUserInfo } from 'lib/types/user-types';
import type { RawThreadInfo } from 'lib/types/thread-types';
import type { ViewerData, AnonymousViewerData, UserViewerData } from './viewer';

import invariant from 'invariant';
import bcrypt from 'twin-bcrypt';
import url from 'url';
import crypto from 'crypto';

import { ServerError } from 'lib/utils/fetch-utils';

import { pool, SQL } from '../database';
import { Viewer } from './viewer';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import urlFacts from '../../facts/url';
import createIDs from '../creators/id-creator';

const { baseDomain, basePath, https } = urlFacts;

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
  const [ type, cookie ] = cookiePair.split("=");
  if (type === cookieType.USER && cookie) {
    return await fetchUserViewer(cookie, cookieSource.BODY);
  } else if (type === cookieType.ANONYMOUS && cookie) {
    return await fetchAnonymousViewer(cookie, cookieSource.BODY);
  }
  return null;
}

async function fetchViewerFromRequest(req: $Request): Promise<Viewer> {
  let viewer = await fetchViewerFromRequestBody(req);
  if (!viewer) {
    viewer = await fetchViewerFromCookieData(req.cookies);
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

const domainAsURL = new url.URL(baseDomain);
const cookieOptions = {
  domain: domainAsURL.hostname,
  path: basePath,
  httpOnly: true,
  secure: https,
};

async function addCookieChangeInfoToResult(
  viewer: Viewer,
  res: $Response,
  result: Object,
) {
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
    cookieChange.cookie = viewer.cookiePairString;
  } else {
    res.cookie(
      viewer.cookieName,
      viewer.cookieString,
      {
        ...cookieOptions,
        maxAge: cookieLifetime,
      },
    );
    if (viewer.cookieName !== viewer.initialCookieName) {
      res.clearCookie(viewer.initialCookieName, cookieOptions);
    }
  }
  result.cookieChange = cookieChange;
}

async function createNewAnonymousCookie(): Promise<AnonymousViewerData> {
  const time = Date.now();
  const cookiePassword = crypto.randomBytes(32).toString('hex');
  const cookieHash = bcrypt.hashSync(cookiePassword);
  const [ id ] = await createIDs("cookies", 1);
  const cookieRow = [id, cookieHash, null, time, time, 0];
  const query = SQL`
    INSERT INTO cookies(id, hash, user, creation_time, last_update, last_ping)
    VALUES ${[cookieRow]}
  `;
  await pool.query(query);
  return {
    loggedIn: false,
    id,
    cookieID: id,
    cookiePassword,
  };
}

async function deleteCookie(viewerData: ViewerData): Promise<void> {
  await pool.query(SQL`
    DELETE c, i
    FROM cookies c
    LEFT JOIN ids i ON i.id = c.id
    WHERE c.id = ${viewerData.cookieID}
  `);
}

async function createNewUserCookie(userID: string): Promise<UserViewerData> {
  const time = Date.now();
  const cookiePassword = crypto.randomBytes(32).toString('hex');
  const cookieHash = bcrypt.hashSync(cookiePassword);
  const [ cookieID ] = await createIDs("cookies", 1);
  const cookieRow = [cookieID, cookieHash, userID, time, time, 0];
  const query = SQL`
    INSERT INTO cookies(id, hash, user, creation_time, last_update, last_ping)
    VALUES ${[cookieRow]}
  `;
  await pool.query(query);
  return {
    loggedIn: true,
    id: userID,
    userID,
    cookieID,
    cookiePassword,
  };
}

export {
  cookieType,
  fetchViewerFromRequest,
  addCookieChangeInfoToResult,
  createNewAnonymousCookie,
  deleteCookie,
  createNewUserCookie,
};
