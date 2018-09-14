// @flow

import type { $Response, $Request } from 'express';
import type { ViewerData, AnonymousViewerData, UserViewerData } from './viewer';
import {
  type SessionChange,
  cookieLifetime,
  cookieSources,
  type CookieSource,
  cookieTypes,
  sessionIdentifierTypes,
  type SessionIdentifierType,
} from 'lib/types/session-types';
import {
  type Platform,
  type PlatformDetails,
  isDeviceType,
} from 'lib/types/device-types';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { UserInfo } from 'lib/types/user-types';

import bcrypt from 'twin-bcrypt';
import url from 'url';
import crypto from 'crypto';

import { ServerError } from 'lib/utils/errors';
import { values } from 'lib/utils/objects';

import { dbQuery, SQL } from '../database';
import { Viewer } from './viewer';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import urlFacts from '../../facts/url';
import createIDs from '../creators/id-creator';
import { assertSecureRequest } from '../utils/security-utils';
import { deleteCookie } from '../deleters/cookie-deleters';
import { handleAsyncPromise } from '../responders/handlers';
import { createSession } from '../creators/session-creator';

const { baseDomain, basePath, https } = urlFacts;

function cookieIsExpired(lastUsed: number) {
  return lastUsed + cookieLifetime <= Date.now();
}

type FetchViewerResult =
  | {| type: "valid", viewer: Viewer |}
  | {|
      type: "nonexistant",
      cookieName: ?string,
      cookieSource: ?CookieSource,
      sessionIdentifierType: SessionIdentifierType,
    |}
  | {|
      type: "invalidated",
      cookieName: string,
      cookieID: string,
      cookieSource: CookieSource,
      sessionIdentifierType: SessionIdentifierType,
      platformDetails: ?PlatformDetails,
    |};

async function fetchUserViewer(
  cookie: string,
  cookieSource: CookieSource,
  req: $Request,
): Promise<FetchViewerResult> {
  const sessionIdentifierType = getSessionIdentifierTypeFromRequestBody(req);
  const [ cookieID, cookiePassword ] = cookie.split(':');
  if (!cookieID || !cookiePassword) {
    return {
      type: "nonexistant",
      cookieName: cookieTypes.USER,
      cookieSource,
      sessionIdentifierType,
    };
  }

  const query = SQL`
    SELECT hash, user, last_used, platform, device_token, versions
    FROM cookies
    WHERE id = ${cookieID} AND user IS NOT NULL
  `;
  const [ [ result ], sessionID ] = await Promise.all([
    dbQuery(query),
    getValidatedSessionIDFromRequestBody(req, cookieID),
  ]);
  if (result.length === 0) {
    return {
      type: "nonexistant",
      cookieName: cookieTypes.USER,
      cookieSource,
      sessionIdentifierType,
    };
  }

  const cookieRow = result[0];
  let platformDetails = null;
  if (cookieRow.platform && cookieRow.versions) {
    platformDetails = {
      platform: cookieRow.platform,
      codeVersion: cookieRow.versions.codeVersion,
      stateVersion: cookieRow.versions.stateVersion,
    };
  } else if (cookieRow.platform) {
    platformDetails = { platform: cookieRow.platform };
  }

  if (
    !bcrypt.compareSync(cookiePassword, cookieRow.hash) ||
    cookieIsExpired(cookieRow.last_used)
  ) {
    return {
      type: "invalidated",
      cookieName: cookieTypes.USER,
      cookieID,
      cookieSource,
      sessionIdentifierType,
      platformDetails,
    };
  }
  const userID = cookieRow.user.toString();
  const viewer = new Viewer({
    loggedIn: true,
    id: userID,
    platformDetails,
    deviceToken: cookieRow.device_token,
    userID,
    cookieSource,
    cookieID,
    cookiePassword,
    sessionIdentifierType,
    sessionID,
  });
  return { type: "valid", viewer };
}

async function fetchAnonymousViewer(
  cookie: string,
  cookieSource: CookieSource,
  req: $Request,
): Promise<FetchViewerResult> {
  const sessionIdentifierType = getSessionIdentifierTypeFromRequestBody(req);
  const [ cookieID, cookiePassword ] = cookie.split(':');
  if (!cookieID || !cookiePassword) {
    return {
      type: "nonexistant",
      cookieName: cookieTypes.ANONYMOUS,
      cookieSource,
      sessionIdentifierType,
    };
  }

  const query = SQL`
    SELECT last_used, hash, platform, device_token, versions
    FROM cookies
    WHERE id = ${cookieID} AND user IS NULL
  `;
  const [ [ result ], sessionID ] = await Promise.all([
    dbQuery(query),
    getValidatedSessionIDFromRequestBody(req, cookieID),
  ]);
  if (result.length === 0) {
    return {
      type: "nonexistant",
      cookieName: cookieTypes.ANONYMOUS,
      cookieSource,
      sessionIdentifierType,
    };
  }

  const cookieRow = result[0];
  let platformDetails = null;
  if (cookieRow.platform && cookieRow.versions) {
    platformDetails = {
      platform: cookieRow.platform,
      codeVersion: cookieRow.versions.codeVersion,
      stateVersion: cookieRow.versions.stateVersion,
    };
  } else if (cookieRow.platform) {
    platformDetails = { platform: cookieRow.platform };
  }

  if (
    !bcrypt.compareSync(cookiePassword, cookieRow.hash) ||
    cookieIsExpired(cookieRow.last_used)
  ) {
    return {
      type: "invalidated",
      cookieName: cookieTypes.ANONYMOUS,
      cookieID,
      cookieSource,
      sessionIdentifierType,
      platformDetails,
    };
  }
  const viewer = new Viewer({
    loggedIn: false,
    id: cookieID,
    platformDetails,
    deviceToken: cookieRow.device_token,
    cookieSource,
    cookieID,
    cookiePassword,
    sessionIdentifierType,
    sessionID,
  });
  return { type: "valid", viewer };
}

function getSessionIDFromRequestBody(req: $Request): ?string {
  const body = (req.body: any);
  if (req.method === "GET" && body.sessionID === undefined) {
    // GET requests are only done from web, and web requests should always
    // specify a sessionID since the cookieID can't be guaranteed unique
    return null;
  }
  return body.sessionID;
}

function getSessionIdentifierTypeFromRequestBody(
  req: $Request,
): SessionIdentifierType {
  if (req.method === "GET") {
    // GET requests are only done from web, and web requests should always
    // specify a sessionID since the cookieID can't be guaranteed unique
    return sessionIdentifierTypes.BODY_SESSION_ID;
  }
  const sessionID = getSessionIDFromRequestBody(req);
  return sessionID === undefined
    ? sessionIdentifierTypes.COOKIE_ID
    : sessionIdentifierTypes.BODY_SESSION_ID;
}

async function getValidatedSessionIDFromRequestBody(
  req: $Request,
  cookieID: string,
): Promise<?string> {
  const sessionID = getSessionIDFromRequestBody(req);
  if (!sessionID) {
    return sessionID;
  }
  const query = SQL`
    SELECT id
    FROM sessions
    WHERE id = ${sessionID} AND cookie = ${cookieID}
  `;
  const [ result ] = await dbQuery(query);
  return result.length > 0 ? sessionID : null;
}

// This function is meant to consume a cookie that has already been processed.
// That means it doesn't have any logic to handle an invalid cookie, and it
// doesn't update the cookie's last_used timestamp.
async function fetchViewerFromCookieData(
  req: $Request,
): Promise<FetchViewerResult> {
  const { user, anonymous } = req.cookies;
  if (user) {
    return await fetchUserViewer(user, cookieSources.HEADER, req);
  } else if (anonymous) {
    return await fetchAnonymousViewer(anonymous, cookieSources.HEADER, req);
  }
  return {
    type: "nonexistant",
    cookieName: null,
    cookieSource: null,
    sessionIdentifierType: getSessionIdentifierTypeFromRequestBody(req),
  };
}

async function fetchViewerFromRequestBody(
  req: $Request,
): Promise<FetchViewerResult> {
  const body = (req.body: any);
  const cookiePair = body.cookie;
  if (cookiePair === null) {
    return {
      type: "nonexistant",
      cookieName: null,
      cookieSource: cookieSources.BODY,
      sessionIdentifierType: getSessionIdentifierTypeFromRequestBody(req),
    };
  }
  if (!cookiePair || !(typeof cookiePair === "string")) {
    return {
      type: "nonexistant",
      cookieName: null,
      cookieSource: null,
      sessionIdentifierType: getSessionIdentifierTypeFromRequestBody(req),
    };
  }
  const [ type, cookie ] = cookiePair.split("=");
  if (type === cookieTypes.USER && cookie) {
    return await fetchUserViewer(cookie, cookieSources.BODY, req);
  } else if (type === cookieTypes.ANONYMOUS && cookie) {
    return await fetchAnonymousViewer(cookie, cookieSources.BODY, req);
  }
  return {
    type: "nonexistant",
    cookieName: null,
    cookieSource: null,
    sessionIdentifierType: getSessionIdentifierTypeFromRequestBody(req),
  };
}

async function fetchViewerForJSONRequest(req: $Request): Promise<Viewer> {
  assertSecureRequest(req);
  let result = await fetchViewerFromRequestBody(req);
  if (result.cookieSource === null || result.cookieSource === undefined) {
    result = await fetchViewerFromCookieData(req);
  }
  return await handleFetchViewerResult(result);
}

const webPlatformDetails = { platform: "web" };
async function fetchViewerForHomeRequest(req: $Request): Promise<Viewer> {
  assertSecureRequest(req);
  const result = await fetchViewerFromCookieData(req);
  return await handleFetchViewerResult(result, webPlatformDetails);
}

async function handleFetchViewerResult(
  result: FetchViewerResult,
  inputPlatformDetails?: PlatformDetails,
) {
  if (result.type === "valid") {
    return result.viewer;
  }

  let platformDetails = inputPlatformDetails;
  if (!platformDetails && result.type === "invalidated") {
    platformDetails = result.platformDetails;
  }

  const [ anonymousViewerData ] = await Promise.all([
    createNewAnonymousCookie(platformDetails),
    result.type === "invalidated"
      ? deleteCookie(result.cookieID)
      : null,
  ]);

  // If a null cookie was specified in the request body, result.cookieSource
  // will still be BODY here. The only way it would be null or undefined here
  // is if there was no cookie specified in either the body or the header, in
  // which case we default to returning the new cookie in the response header.
  const cookieSource =
    result.cookieSource !== null && result.cookieSource !== undefined
      ? result.cookieSource
      : cookieSources.HEADER;
  const viewer = new Viewer({
    ...anonymousViewerData,
    cookieSource,
    sessionIdentifierType: result.sessionIdentifierType,
  });
  viewer.sessionChanged = true;

  // If cookieName is falsey, that tells us that there was no cookie specified
  // in the request, which means we can't be invalidating anything.
  if (result.cookieName) {
    viewer.cookieInvalidated = true;
    viewer.initialCookieName = result.cookieName;
  }

  return viewer;
}

const domainAsURL = new url.URL(baseDomain);
async function addSessionChangeInfoToResult(
  viewer: Viewer,
  res: $Response,
  result: Object,
) {
  const { threadInfos, userInfos } = await fetchThreadInfos(viewer);
  let sessionChange;
  if (viewer.cookieInvalidated) {
    sessionChange = ({
      cookieInvalidated: true,
      threadInfos,
      userInfos: (values(userInfos).map(a => a): UserInfo[]),
      currentUserInfo: {
        id: viewer.cookieID,
        anonymous: true,
      },
    }: SessionChange);
  } else {
    sessionChange = ({
      cookieInvalidated: false,
      threadInfos,
      userInfos: (values(userInfos).map(a => a): UserInfo[]),
    }: SessionChange);
  }
  if (viewer.cookieSource === cookieSources.BODY) {
    sessionChange.cookie = viewer.cookiePairString;
  } else {
    addActualHTTPCookie(viewer, res);
  }
  if (viewer.sessionIdentifierType === sessionIdentifierTypes.BODY_SESSION_ID) {
    sessionChange.sessionID = viewer.sessionID ? viewer.sessionID : null;
  }
  result.cookieChange = sessionChange;
}

// The AnonymousViewerData returned by this function...
// (1) Does not specify a sessionIdentifierType. This will cause an exception
//     if passed directly to the Viewer constructor, so the caller should set it
//     before doing so.
// (2) Does not specify a cookieSource. This will cause an exception if passed
//     directly to the Viewer constructor, so the caller should set it before
//     doing so.
const defaultPlatformDetails = {};
async function createNewAnonymousCookie(
  platformDetails: ?PlatformDetails,
): Promise<AnonymousViewerData> {
  const time = Date.now();
  const cookiePassword = crypto.randomBytes(32).toString('hex');
  const cookieHash = bcrypt.hashSync(cookiePassword);
  const [ id ] = await createIDs("cookies", 1);
  const { platform, ...versions } = (platformDetails || defaultPlatformDetails);
  const versionsString = Object.keys(versions).length > 0
    ? JSON.stringify(versions)
    : null;
  const cookieRow = [
    id,
    cookieHash,
    null,
    platform,
    time,
    time,
    versionsString,
  ];
  const query = SQL`
    INSERT INTO cookies(id, hash, user, platform, creation_time, last_used,
      versions)
    VALUES ${[cookieRow]}
  `;
  await dbQuery(query);
  return {
    loggedIn: false,
    id,
    platformDetails,
    deviceToken: null,
    cookieID: id,
    cookiePassword,
    sessionID: undefined,
    cookieInsertedThisRequest: true,
  };
}

// The UserViewerData returned by this function...
// (1) Will always have an undefined sessionID. If the caller wants the response
//     body to specify a sessionID, they need to call setSessionID on Viewer.
// (2) Does not specify a sessionIdentifierType. Currently this function is only
//     ever called with the intent of passing its return value to setNewCookie,
//     which means it will inherit the earlier value of sessionIdentifierType
//     and won't throw an exception, as it would if passed directly to the
//     Viewer constructor.
// (3) Does not specify a cookieSource. Same as (2), this only works because the
//     result is never passed directly to the Viewer constructor.
async function createNewUserCookie(
  userID: string,
  platformDetails: ?PlatformDetails,
): Promise<UserViewerData> {
  const time = Date.now();
  const cookiePassword = crypto.randomBytes(32).toString('hex');
  const cookieHash = bcrypt.hashSync(cookiePassword);
  const [ cookieID ] = await createIDs("cookies", 1);
  const { platform, ...versions } = (platformDetails || defaultPlatformDetails);
  const versionsString = Object.keys(versions).length > 0
    ? JSON.stringify(versions)
    : null;
  const cookieRow = [
    cookieID,
    cookieHash,
    userID,
    platform,
    time,
    time,
    versionsString,
  ];
  const query = SQL`
    INSERT INTO cookies(id, hash, user, platform, creation_time, last_used,
      versions)
    VALUES ${[cookieRow]}
  `;
  await dbQuery(query);
  return {
    loggedIn: true,
    id: userID,
    platformDetails,
    deviceToken: null,
    userID,
    cookieID,
    sessionID: undefined,
    cookiePassword,
    cookieInsertedThisRequest: true,
  };
}

// This gets called after createNewUserCookie and from websiteResponder. If the
// Viewer's sessionIdentifierType is COOKIE_ID then the cookieID is used as the
// session identifier; otherwise, a new ID is create for the session.
async function setNewSession(
  viewer: Viewer,
  calendarQuery: CalendarQuery,
  initialLastUpdate: number,
): Promise<void> {
  if (viewer.sessionIdentifierType !== sessionIdentifierTypes.COOKIE_ID) {
    const [ sessionID ] = await createIDs("sessions", 1);
    viewer.setSessionID(sessionID);
  }
  await createSession(viewer, calendarQuery, initialLastUpdate);
}

async function extendCookieLifespan(cookieID: string) {
  const time = Date.now();
  const query = SQL`
    UPDATE cookies SET last_used = ${time} WHERE id = ${cookieID}
  `;
  await dbQuery(query);
}

async function addCookieToJSONResponse(
  viewer: Viewer,
  res: $Response,
  result: Object,
) {
  if (!viewer.getData().cookieInsertedThisRequest) {
    handleAsyncPromise(extendCookieLifespan(viewer.cookieID));
  }
  if (viewer.sessionChanged) {
    await addSessionChangeInfoToResult(viewer, res, result);
  } else if (viewer.cookieSource !== cookieSources.BODY) {
    addActualHTTPCookie(viewer, res);
  }
}

function addCookieToHomeResponse(viewer: Viewer, res: $Response) {
  if (!viewer.getData().cookieInsertedThisRequest) {
    handleAsyncPromise(extendCookieLifespan(viewer.cookieID));
  }
  addActualHTTPCookie(viewer, res);
}

const cookieOptions = {
  domain: domainAsURL.hostname,
  path: basePath,
  httpOnly: true,
  secure: https,
  maxAge: cookieLifetime,
};
function addActualHTTPCookie(viewer: Viewer, res: $Response) {
  res.cookie(
    viewer.cookieName,
    viewer.cookieString,
    cookieOptions,
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

async function setCookiePlatformDetails(
  cookieID: string,
  platformDetails: PlatformDetails,
): Promise<void> {
  const { platform, ...versions } = platformDetails;
  const versionsString = Object.keys(versions).length > 0
    ? JSON.stringify(versions)
    : null;
  const query = SQL`
    UPDATE cookies
    SET platform = ${platform}, versions = ${versionsString}
    WHERE id = ${cookieID}
  `;
  await dbQuery(query);
}

export {
  fetchViewerForJSONRequest,
  fetchViewerForHomeRequest,
  createNewAnonymousCookie,
  createNewUserCookie,
  setNewSession,
  addCookieToJSONResponse,
  addCookieToHomeResponse,
  setCookiePlatform,
  setCookiePlatformDetails,
};
