// @flow

import type { $Response, $Request } from 'express';
import type { UserInfo, CurrentUserInfo } from 'lib/types/user-types';
import type { RawThreadInfo } from 'lib/types/thread-types';
import type { ViewerData, AnonymousViewerData, UserViewerData } from './viewer';
import type { DeviceTokens } from 'lib/types/device-types';

import bcrypt from 'twin-bcrypt';
import url from 'url';
import crypto from 'crypto';

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL, mergeOrConditions } from '../database';
import { Viewer } from './viewer';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import urlFacts from '../../facts/url';
import createIDs from '../creators/id-creator';
import { assertSecureRequest } from '../utils/security-utils';

const { baseDomain, basePath, https } = urlFacts;

const cookieLifetime = 30*24*60*60*1000; // in milliseconds
const cookieSource = Object.freeze({
  BODY: 0,
  HEADER: 1,
  GENERATED: 2,
});
export type CookieSource = $Values<typeof cookieSource>;
const cookieType = Object.freeze({
  USER: "user",
  ANONYMOUS: "anonymous",
});
type CookieType = $Values<typeof cookieType>;

type FetchViewerResult =
  | {| type: "valid", viewer: Viewer |}
  | {| type: "nonexistant", cookieName: ?string, source: CookieSource |}
  | {|
      type: "invalidated",
      cookieName: string,
      cookieID: string,
      source: CookieSource,
    |};

async function fetchUserViewer(
  cookie: string,
  source: CookieSource,
): Promise<FetchViewerResult> {
  const [ cookieID, cookiePassword ] = cookie.split(':');
  if (!cookieID || !cookiePassword) {
    return { type: "nonexistant", cookieName: cookieType.USER, source };
  }
  const query = SQL`
    SELECT hash, user, last_update FROM cookies
    WHERE id = ${cookieID} AND user IS NOT NULL
  `;
  const [ result ] = await dbQuery(query);
  if (result.length === 0) {
    return { type: "nonexistant", cookieName: cookieType.USER, source };
  }
  const cookieRow = result[0];
  if (
    !bcrypt.compareSync(cookiePassword, cookieRow.hash) ||
    cookieRow.last_update + cookieLifetime <= Date.now()
  ) {
    return {
      type: "invalidated",
      cookieName: cookieType.USER,
      cookieID,
      source,
    };
  }
  const userID = cookieRow.user.toString();
  const viewer = new Viewer(
    {
      loggedIn: true,
      id: userID,
      userID,
      cookieID,
      cookiePassword,
    },
    source,
  );
  return { type: "valid", viewer };
}

async function fetchAnonymousViewer(
  cookie: string,
  source: CookieSource,
): Promise<FetchViewerResult> {
  const [ cookieID, cookiePassword ] = cookie.split(':');
  if (!cookieID || !cookiePassword) {
    return { type: "nonexistant", cookieName: cookieType.ANONYMOUS, source };
  }
  const query = SQL`
    SELECT last_update, hash FROM cookies
    WHERE id = ${cookieID} AND user IS NULL
  `;
  const [ result ] = await dbQuery(query);
  if (result.length === 0) {
    return { type: "nonexistant", cookieName: cookieType.ANONYMOUS, source };
  }
  const cookieRow = result[0];
  if (
    !bcrypt.compareSync(cookiePassword, cookieRow.hash) ||
    cookieRow.last_update + cookieLifetime <= Date.now()
  ) {
    return {
      type: "invalidated",
      cookieName: cookieType.ANONYMOUS,
      cookieID,
      source,
    };
  }
  const viewer = new Viewer(
    {
      loggedIn: false,
      id: cookieID,
      cookieID,
      cookiePassword,
    },
    source,
  );
  return { type: "valid", viewer };
}

// This function is meant to consume a cookie that has already been processed.
// That means it doesn't have any logic to handle an invalid cookie, and it
// doesn't the cookie's last_update timestamp.
async function fetchViewerFromCookieData(
  cookieData: {[cookieName: string]: string},
): Promise<?FetchViewerResult> {
  if (cookieData.user) {
    return await fetchUserViewer(cookieData.user, cookieSource.HEADER);
  } else if (cookieData.anonymous) {
    return await fetchAnonymousViewer(cookieData.anonymous, cookieSource.HEADER);
  }
  return null;
}

async function fetchViewerFromRequestBody(
  req: $Request,
): Promise<?FetchViewerResult> {
  const body = (req.body: any);
  const cookiePair = body.cookie;
  if (cookiePair === null) {
    return { type: "nonexistant", cookieName: null, source: cookieSource.BODY };
  }
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

async function fetchViewerForJSONRequest(req: $Request): Promise<Viewer> {
  assertSecureRequest(req);
  let result = await fetchViewerFromRequestBody(req);
  if (!result) {
    result = await fetchViewerFromCookieData(req.cookies);
  }
  return await handleFetchViewerResult(result);
}

async function fetchViewerForHomeRequest(req: $Request): Promise<Viewer> {
  assertSecureRequest(req);
  const result = await fetchViewerFromCookieData(req.cookies);
  return await handleFetchViewerResult(result);
}

async function handleFetchViewerResult(result: ?FetchViewerResult) {
  if (result && result.type === "valid") {
    return result.viewer;
  }

  const [ anonymousViewerData ] = await Promise.all([
    createNewAnonymousCookie(),
    result && result.type === "invalidated"
      ? deleteCookie(result.cookieID)
      : null,
  ]);
  const source = result ? result.source : cookieSource.GENERATED;
  const viewer = new Viewer(anonymousViewerData, source);

  if (result) {
    viewer.cookieChanged = true;
    // If cookieName is falsey, that means it's not an actual invalidation. It
    // means there was a null cookie specified in the request body, which tells
    // us that the client wants the new cookie specified in the result body.
    if (result.cookieName) {
      viewer.cookieInvalidated = true;
      viewer.initialCookieName = result.cookieName;
    }
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
  await dbQuery(query);
  return {
    loggedIn: false,
    id,
    cookieID: id,
    cookiePassword,
    insertionTime: time,
  };
}

async function deleteCookie(cookieID: string): Promise<void> {
  await dbQuery(SQL`
    DELETE c, i
    FROM cookies c
    LEFT JOIN ids i ON i.id = c.id
    WHERE c.id = ${cookieID}
  `);
}

async function deleteCookiesWithDeviceTokens(
  userID: string,
  deviceTokens: DeviceTokens,
): Promise<void> {
  const conditions = [];
  if (deviceTokens.ios) {
    conditions.push(SQL`ios_device_token = ${deviceTokens.ios}`);
  }
  if (deviceTokens.android) {
    conditions.push(SQL`android_device_token = ${deviceTokens.android}`);
  }
  if (conditions.length === 0) {
    return;
  }
  const query = SQL`
    DELETE c, i
    FROM cookies c
    LEFT JOIN ids i ON i.id = c.id
    WHERE c.user = ${userID} AND
  `;
  query.append(mergeOrConditions(conditions));
  await dbQuery(query);
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
  await dbQuery(query);
  return {
    loggedIn: true,
    id: userID,
    userID,
    cookieID,
    cookiePassword,
    insertionTime: time,
  };
}

async function extendCookieLifespan(cookieID: string) {
  const time = Date.now();
  const query = SQL`
    UPDATE cookies SET last_update = ${time} WHERE id = ${cookieID}
  `;
  await dbQuery(query);
}

async function addCookieToJSONResponse(
  viewer: Viewer,
  res: $Response,
  result: Object,
) {
  if (viewer.cookieChanged) {
    await addCookieChangeInfoToResult(viewer, res, result);
    return;
  }
  if (!viewer.getData().insertionTime) {
    extendCookieLifespan(viewer.cookieID);
  }
  if (viewer.initializationSource !== cookieSource.BODY) {
    res.cookie(
      viewer.cookieName,
      viewer.cookieString,
      {
        ...cookieOptions,
        maxAge: cookieLifetime,
      },
    );
  }
}

function addCookieToHomeResponse(viewer: Viewer, res: $Response) {
  if (!viewer.getData().insertionTime) {
    extendCookieLifespan(viewer.cookieID);
  }
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

export {
  cookieType,
  fetchViewerForJSONRequest,
  fetchViewerForHomeRequest,
  createNewAnonymousCookie,
  deleteCookie,
  deleteCookiesWithDeviceTokens,
  createNewUserCookie,
  addCookieToJSONResponse,
  addCookieToHomeResponse,
};
