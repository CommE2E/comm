// @flow

import type { $Response, $Request } from 'express';
import type { UserInfo, CurrentUserInfo } from 'lib/types/user-types';
import type { RawThreadInfo } from 'lib/types/thread-types';
import type { ViewerData, AnonymousViewerData, UserViewerData } from './viewer';
import type { Platform } from 'lib/types/device-types';

import bcrypt from 'twin-bcrypt';
import url from 'url';
import crypto from 'crypto';

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database';
import { Viewer } from './viewer';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import urlFacts from '../../facts/url';
import createIDs from '../creators/id-creator';
import { assertSecureRequest } from '../utils/security-utils';
import { deleteCookie } from '../deleters/cookie-deleters';

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

function cookieIsExpired(lastUpdate: number) {
  return lastUpdate + cookieLifetime <= Date.now();
}

type FetchViewerResult =
  | {| type: "valid", viewer: Viewer |}
  | {| type: "nonexistant", cookieName: ?string, source: CookieSource |}
  | {|
      type: "invalidated",
      cookieName: string,
      cookieID: string,
      source: CookieSource,
      platform: ?Platform,
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
    SELECT hash, user, last_used, platform, device_token
    FROM cookies
    WHERE id = ${cookieID} AND user IS NOT NULL
  `;
  const [ result ] = await dbQuery(query);
  if (result.length === 0) {
    return { type: "nonexistant", cookieName: cookieType.USER, source };
  }
  const cookieRow = result[0];
  if (
    !bcrypt.compareSync(cookiePassword, cookieRow.hash) ||
    cookieIsExpired(cookieRow.last_used)
  ) {
    return {
      type: "invalidated",
      cookieName: cookieType.USER,
      cookieID,
      source,
      platform: cookieRow.platform,
    };
  }
  const userID = cookieRow.user.toString();
  const viewer = new Viewer(
    {
      loggedIn: true,
      id: userID,
      platform: cookieRow.platform,
      deviceToken: cookieRow.device_token,
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
    SELECT last_used, hash, platform, device_token
    FROM cookies
    WHERE id = ${cookieID} AND user IS NULL
  `;
  const [ result ] = await dbQuery(query);
  if (result.length === 0) {
    return { type: "nonexistant", cookieName: cookieType.ANONYMOUS, source };
  }
  const cookieRow = result[0];
  if (
    !bcrypt.compareSync(cookiePassword, cookieRow.hash) ||
    cookieIsExpired(cookieRow.last_used)
  ) {
    return {
      type: "invalidated",
      cookieName: cookieType.ANONYMOUS,
      cookieID,
      source,
      platform: cookieRow.platform,
    };
  }
  const viewer = new Viewer(
    {
      loggedIn: false,
      id: cookieID,
      platform: cookieRow.platform,
      deviceToken: cookieRow.device_token,
      cookieID,
      cookiePassword,
    },
    source,
  );
  return { type: "valid", viewer };
}

// This function is meant to consume a cookie that has already been processed.
// That means it doesn't have any logic to handle an invalid cookie, and it
// doesn't update the cookie's last_used timestamp.
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
  return await handleFetchViewerResult(result, "web");
}

async function handleFetchViewerResult(
  result: ?FetchViewerResult,
  inputPlatform?: Platform,
) {
  if (result && result.type === "valid") {
    return result.viewer;
  }

  let platform = inputPlatform;
  if (!platform && result && result.type === "invalidated") {
    platform = result.platform;
  }

  const [ anonymousViewerData ] = await Promise.all([
    createNewAnonymousCookie(platform),
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

async function createNewAnonymousCookie(
  platform: ?Platform,
): Promise<AnonymousViewerData> {
  const time = Date.now();
  const cookiePassword = crypto.randomBytes(32).toString('hex');
  const cookieHash = bcrypt.hashSync(cookiePassword);
  const [ id ] = await createIDs("cookies", 1);
  const cookieRow = [id, cookieHash, null, platform, time, time, 0];
  const query = SQL`
    INSERT INTO cookies(id, hash, user, platform, creation_time, last_used,
      last_update)
    VALUES ${[cookieRow]}
  `;
  await dbQuery(query);
  return {
    loggedIn: false,
    id,
    platform,
    deviceToken: null,
    cookieID: id,
    cookiePassword,
    insertionTime: time,
  };
}

async function createNewUserCookie(
  userID: string,
  initialLastUpdate: number,
  platform: ?Platform,
): Promise<UserViewerData> {
  const time = Date.now();
  const cookiePassword = crypto.randomBytes(32).toString('hex');
  const cookieHash = bcrypt.hashSync(cookiePassword);
  const [ cookieID ] = await createIDs("cookies", 1);
  const cookieRow =
    [cookieID, cookieHash, userID, platform, time, time, initialLastUpdate];
  const query = SQL`
    INSERT INTO cookies(id, hash, user, platform, creation_time, last_used,
      last_update)
    VALUES ${[cookieRow]}
  `;
  await dbQuery(query);
  return {
    loggedIn: true,
    id: userID,
    platform,
    deviceToken: null,
    userID,
    cookieID,
    cookiePassword,
    insertionTime: time,
  };
}

async function extendCookieLifespan(cookieID: string) {
  const time = Date.now();
  const query = SQL`
    UPDATE cookies SET last_used = ${time} WHERE id = ${cookieID}
  `;
  await dbQuery(query);
}

async function recordDeliveredUpdate(
  cookieID: string,
  mostRecentUpdateTimestamp: number,
) {
  const query = SQL`
    UPDATE cookies
    SET last_update = ${mostRecentUpdateTimestamp}
    WHERE id = ${cookieID}
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

async function setCookiePlatform(
  cookieID: string,
  platform: Platform,
): Promise<void> {
  const query = SQL`
    UPDATE cookies
    SET platform = ${platform}
    WHERE id = ${cookieID}
  `;
  await dbQuery(query);
}

export {
  cookieLifetime,
  cookieType,
  fetchViewerForJSONRequest,
  fetchViewerForHomeRequest,
  createNewAnonymousCookie,
  createNewUserCookie,
  recordDeliveredUpdate,
  addCookieToJSONResponse,
  addCookieToHomeResponse,
  setCookiePlatform,
};
