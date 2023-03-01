// @flow

import crypto from 'crypto';
import type { $Response, $Request } from 'express';
import invariant from 'invariant';
import bcrypt from 'twin-bcrypt';
import url from 'url';

import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import type { Shape } from 'lib/types/core.js';
import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';
import { isWebPlatform } from 'lib/types/device-types.js';
import type { Platform, PlatformDetails } from 'lib/types/device-types.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import {
  type ServerSessionChange,
  cookieLifetime,
  cookieSources,
  type CookieSource,
  cookieTypes,
  sessionIdentifierTypes,
  type SessionIdentifierType,
} from 'lib/types/session-types.js';
import type { SIWESocialProof } from 'lib/types/siwe-types.js';
import type { InitialClientSocketMessage } from 'lib/types/socket-types.js';
import type { UserInfo } from 'lib/types/user-types.js';
import { values } from 'lib/utils/objects.js';
import { promiseAll } from 'lib/utils/promises.js';

import { Viewer } from './viewer.js';
import type { AnonymousViewerData, UserViewerData } from './viewer.js';
import createIDs from '../creators/id-creator.js';
import { createSession } from '../creators/session-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { deleteCookie } from '../deleters/cookie-deleters.js';
import { handleAsyncPromise } from '../responders/handlers.js';
import { clearDeviceToken } from '../updaters/device-token-updaters.js';
import { updateThreadMembers } from '../updaters/thread-updaters.js';
import { assertSecureRequest } from '../utils/security-utils.js';
import {
  type AppURLFacts,
  getAppURLFactsFromRequestURL,
} from '../utils/urls.js';

function cookieIsExpired(lastUsed: number) {
  return lastUsed + cookieLifetime <= Date.now();
}

type SessionParameterInfo = {
  isSocket: boolean,
  sessionID: ?string,
  sessionIdentifierType: SessionIdentifierType,
  ipAddress: string,
  userAgent: ?string,
};

type FetchViewerResult =
  | { type: 'valid', viewer: Viewer }
  | InvalidFetchViewerResult;

type InvalidFetchViewerResult =
  | {
      type: 'nonexistant',
      cookieName: ?string,
      cookieSource: ?CookieSource,
      sessionParameterInfo: SessionParameterInfo,
    }
  | {
      type: 'invalidated',
      cookieName: string,
      cookieID: string,
      cookieSource: CookieSource,
      sessionParameterInfo: SessionParameterInfo,
      platformDetails: ?PlatformDetails,
      deviceToken: ?string,
    };

async function fetchUserViewer(
  cookie: string,
  cookieSource: CookieSource,
  sessionParameterInfo: SessionParameterInfo,
): Promise<FetchViewerResult> {
  const [cookieID, cookiePassword] = cookie.split(':');
  if (!cookieID || !cookiePassword) {
    return {
      type: 'nonexistant',
      cookieName: cookieTypes.USER,
      cookieSource,
      sessionParameterInfo,
    };
  }

  const query = SQL`
    SELECT hash, user, last_used, platform, device_token, versions
    FROM cookies
    WHERE id = ${cookieID} AND user IS NOT NULL
  `;
  const [[result], allSessionInfo] = await Promise.all([
    dbQuery(query),
    fetchSessionInfo(sessionParameterInfo, cookieID),
  ]);
  if (result.length === 0) {
    return {
      type: 'nonexistant',
      cookieName: cookieTypes.USER,
      cookieSource,
      sessionParameterInfo,
    };
  }

  let sessionID = null,
    sessionInfo = null;
  if (allSessionInfo) {
    ({ sessionID, ...sessionInfo } = allSessionInfo);
  }

  const cookieRow = result[0];
  let platformDetails = null;
  if (cookieRow.versions) {
    const versions = JSON.parse(cookieRow.versions);
    platformDetails = {
      platform: cookieRow.platform,
      codeVersion: versions.codeVersion,
      stateVersion: versions.stateVersion,
    };
  } else {
    platformDetails = { platform: cookieRow.platform };
  }
  const deviceToken = cookieRow.device_token;

  if (
    !bcrypt.compareSync(cookiePassword, cookieRow.hash) ||
    cookieIsExpired(cookieRow.last_used)
  ) {
    return {
      type: 'invalidated',
      cookieName: cookieTypes.USER,
      cookieID,
      cookieSource,
      sessionParameterInfo,
      platformDetails,
      deviceToken,
    };
  }
  const userID = cookieRow.user.toString();
  const viewer = new Viewer({
    isSocket: sessionParameterInfo.isSocket,
    loggedIn: true,
    id: userID,
    platformDetails,
    deviceToken,
    userID,
    cookieSource,
    cookieID,
    cookiePassword,
    sessionIdentifierType: sessionParameterInfo.sessionIdentifierType,
    sessionID,
    sessionInfo,
    isScriptViewer: false,
    ipAddress: sessionParameterInfo.ipAddress,
    userAgent: sessionParameterInfo.userAgent,
  });
  return { type: 'valid', viewer };
}

async function fetchAnonymousViewer(
  cookie: string,
  cookieSource: CookieSource,
  sessionParameterInfo: SessionParameterInfo,
): Promise<FetchViewerResult> {
  const [cookieID, cookiePassword] = cookie.split(':');
  if (!cookieID || !cookiePassword) {
    return {
      type: 'nonexistant',
      cookieName: cookieTypes.ANONYMOUS,
      cookieSource,
      sessionParameterInfo,
    };
  }

  const query = SQL`
    SELECT last_used, hash, platform, device_token, versions
    FROM cookies
    WHERE id = ${cookieID} AND user IS NULL
  `;
  const [[result], allSessionInfo] = await Promise.all([
    dbQuery(query),
    fetchSessionInfo(sessionParameterInfo, cookieID),
  ]);
  if (result.length === 0) {
    return {
      type: 'nonexistant',
      cookieName: cookieTypes.ANONYMOUS,
      cookieSource,
      sessionParameterInfo,
    };
  }

  let sessionID = null,
    sessionInfo = null;
  if (allSessionInfo) {
    ({ sessionID, ...sessionInfo } = allSessionInfo);
  }

  const cookieRow = result[0];
  let platformDetails = null;
  if (cookieRow.platform && cookieRow.versions) {
    const versions = JSON.parse(cookieRow.versions);
    platformDetails = {
      platform: cookieRow.platform,
      codeVersion: versions.codeVersion,
      stateVersion: versions.stateVersion,
    };
  } else if (cookieRow.platform) {
    platformDetails = { platform: cookieRow.platform };
  }
  const deviceToken = cookieRow.device_token;

  if (
    !bcrypt.compareSync(cookiePassword, cookieRow.hash) ||
    cookieIsExpired(cookieRow.last_used)
  ) {
    return {
      type: 'invalidated',
      cookieName: cookieTypes.ANONYMOUS,
      cookieID,
      cookieSource,
      sessionParameterInfo,
      platformDetails,
      deviceToken,
    };
  }
  const viewer = new Viewer({
    isSocket: sessionParameterInfo.isSocket,
    loggedIn: false,
    id: cookieID,
    platformDetails,
    deviceToken,
    cookieSource,
    cookieID,
    cookiePassword,
    sessionIdentifierType: sessionParameterInfo.sessionIdentifierType,
    sessionID,
    sessionInfo,
    isScriptViewer: false,
    ipAddress: sessionParameterInfo.ipAddress,
    userAgent: sessionParameterInfo.userAgent,
  });
  return { type: 'valid', viewer };
}

type SessionInfo = {
  +sessionID: ?string,
  +lastValidated: number,
  +lastUpdate: number,
  +calendarQuery: CalendarQuery,
};
async function fetchSessionInfo(
  sessionParameterInfo: SessionParameterInfo,
  cookieID: string,
): Promise<?SessionInfo> {
  const { sessionID } = sessionParameterInfo;
  const session = sessionID !== undefined ? sessionID : cookieID;
  if (!session) {
    return null;
  }
  const query = SQL`
    SELECT query, last_validated, last_update
    FROM sessions
    WHERE id = ${session} AND cookie = ${cookieID}
  `;
  const [result] = await dbQuery(query);
  if (result.length === 0) {
    return null;
  }
  return {
    sessionID,
    lastValidated: result[0].last_validated,
    lastUpdate: result[0].last_update,
    calendarQuery: JSON.parse(result[0].query),
  };
}

// This function is meant to consume a cookie that has already been processed.
// That means it doesn't have any logic to handle an invalid cookie, and it
// doesn't update the cookie's last_used timestamp.
async function fetchViewerFromCookieData(
  req: $Request,
  sessionParameterInfo: SessionParameterInfo,
): Promise<FetchViewerResult> {
  let viewerResult;
  const { user, anonymous } = req.cookies;
  if (user) {
    viewerResult = await fetchUserViewer(
      user,
      cookieSources.HEADER,
      sessionParameterInfo,
    );
  } else if (anonymous) {
    viewerResult = await fetchAnonymousViewer(
      anonymous,
      cookieSources.HEADER,
      sessionParameterInfo,
    );
  } else {
    return {
      type: 'nonexistant',
      cookieName: null,
      cookieSource: null,
      sessionParameterInfo,
    };
  }

  // We protect against CSRF attacks by making sure that on web,
  // non-GET requests cannot use a bare cookie for session identification
  if (viewerResult.type === 'valid') {
    const { viewer } = viewerResult;
    invariant(
      req.method === 'GET' ||
        viewer.sessionIdentifierType !== sessionIdentifierTypes.COOKIE_ID ||
        !isWebPlatform(viewer.platform),
      'non-GET request from web using sessionIdentifierTypes.COOKIE_ID',
    );
  }

  return viewerResult;
}

async function fetchViewerFromRequestBody(
  body: mixed,
  sessionParameterInfo: SessionParameterInfo,
): Promise<FetchViewerResult> {
  if (!body || typeof body !== 'object') {
    return {
      type: 'nonexistant',
      cookieName: null,
      cookieSource: null,
      sessionParameterInfo,
    };
  }
  const cookiePair = body.cookie;
  if (cookiePair === null || cookiePair === '') {
    return {
      type: 'nonexistant',
      cookieName: null,
      cookieSource: cookieSources.BODY,
      sessionParameterInfo,
    };
  }
  if (!cookiePair || typeof cookiePair !== 'string') {
    return {
      type: 'nonexistant',
      cookieName: null,
      cookieSource: null,
      sessionParameterInfo,
    };
  }
  const [type, cookie] = cookiePair.split('=');
  if (type === cookieTypes.USER && cookie) {
    return await fetchUserViewer(
      cookie,
      cookieSources.BODY,
      sessionParameterInfo,
    );
  } else if (type === cookieTypes.ANONYMOUS && cookie) {
    return await fetchAnonymousViewer(
      cookie,
      cookieSources.BODY,
      sessionParameterInfo,
    );
  }
  return {
    type: 'nonexistant',
    cookieName: null,
    cookieSource: null,
    sessionParameterInfo,
  };
}

function getRequestIPAddress(req: $Request) {
  const { proxy } = getAppURLFactsFromRequestURL(req.originalUrl);
  let ipAddress;
  if (proxy === 'none') {
    ipAddress = req.socket.remoteAddress;
  } else if (proxy === 'apache') {
    ipAddress = req.get('X-Forwarded-For');
  }
  invariant(ipAddress, 'could not determine requesting IP address');
  return ipAddress;
}

function getSessionParameterInfoFromRequestBody(
  req: $Request,
): SessionParameterInfo {
  const body = (req.body: any);
  let sessionID =
    body.sessionID !== undefined || req.method !== 'GET'
      ? body.sessionID
      : null;
  if (sessionID === '') {
    sessionID = null;
  }
  const sessionIdentifierType =
    req.method === 'GET' || sessionID !== undefined
      ? sessionIdentifierTypes.BODY_SESSION_ID
      : sessionIdentifierTypes.COOKIE_ID;
  return {
    isSocket: false,
    sessionID,
    sessionIdentifierType,
    ipAddress: getRequestIPAddress(req),
    userAgent: req.get('User-Agent'),
  };
}

async function fetchViewerForJSONRequest(req: $Request): Promise<Viewer> {
  assertSecureRequest(req);
  const sessionParameterInfo = getSessionParameterInfoFromRequestBody(req);
  let result = await fetchViewerFromRequestBody(req.body, sessionParameterInfo);
  if (
    result.type === 'nonexistant' &&
    (result.cookieSource === null || result.cookieSource === undefined)
  ) {
    result = await fetchViewerFromCookieData(req, sessionParameterInfo);
  }
  return await handleFetchViewerResult(result);
}

const webPlatformDetails = { platform: 'web' };
async function fetchViewerForHomeRequest(req: $Request): Promise<Viewer> {
  assertSecureRequest(req);
  const sessionParameterInfo = getSessionParameterInfoFromRequestBody(req);
  const result = await fetchViewerFromCookieData(req, sessionParameterInfo);
  return await handleFetchViewerResult(result, webPlatformDetails);
}

async function fetchViewerForSocket(
  req: $Request,
  clientMessage: InitialClientSocketMessage,
): Promise<?Viewer> {
  assertSecureRequest(req);
  const { sessionIdentification } = clientMessage.payload;
  const { sessionID } = sessionIdentification;
  const sessionParameterInfo = {
    isSocket: true,
    sessionID,
    sessionIdentifierType:
      sessionID !== undefined
        ? sessionIdentifierTypes.BODY_SESSION_ID
        : sessionIdentifierTypes.COOKIE_ID,
    ipAddress: getRequestIPAddress(req),
    userAgent: req.get('User-Agent'),
  };

  let result = await fetchViewerFromRequestBody(
    clientMessage.payload.sessionIdentification,
    sessionParameterInfo,
  );
  if (
    result.type === 'nonexistant' &&
    (result.cookieSource === null || result.cookieSource === undefined)
  ) {
    result = await fetchViewerFromCookieData(req, sessionParameterInfo);
  }
  if (result.type === 'valid') {
    return result.viewer;
  }

  const promises = {};
  if (result.cookieSource === cookieSources.BODY) {
    // We initialize a socket's Viewer after the WebSocket handshake, since to
    // properly initialize the Viewer we need a bunch of data, but that data
    // can't be sent until after the handshake. Consequently, by the time we
    // know that a cookie may be invalid, we are no longer communicating via
    // HTTP, and have no way to set a new cookie for HEADER (web) clients.
    const platformDetails =
      result.type === 'invalidated' ? result.platformDetails : null;
    const deviceToken =
      result.type === 'invalidated' ? result.deviceToken : null;
    promises.anonymousViewerData = createNewAnonymousCookie({
      platformDetails,
      deviceToken,
    });
  }
  if (result.type === 'invalidated') {
    promises.deleteCookie = deleteCookie(result.cookieID);
  }
  const { anonymousViewerData } = await promiseAll(promises);

  if (!anonymousViewerData) {
    return null;
  }

  return createViewerForInvalidFetchViewerResult(result, anonymousViewerData);
}

async function handleFetchViewerResult(
  result: FetchViewerResult,
  inputPlatformDetails?: PlatformDetails,
) {
  if (result.type === 'valid') {
    return result.viewer;
  }

  let platformDetails = inputPlatformDetails;
  if (!platformDetails && result.type === 'invalidated') {
    platformDetails = result.platformDetails;
  }
  const deviceToken = result.type === 'invalidated' ? result.deviceToken : null;

  const [anonymousViewerData] = await Promise.all([
    createNewAnonymousCookie({ platformDetails, deviceToken }),
    result.type === 'invalidated' ? deleteCookie(result.cookieID) : null,
  ]);

  return createViewerForInvalidFetchViewerResult(result, anonymousViewerData);
}

function createViewerForInvalidFetchViewerResult(
  result: InvalidFetchViewerResult,
  anonymousViewerData: AnonymousViewerData,
): Viewer {
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
    sessionIdentifierType: result.sessionParameterInfo.sessionIdentifierType,
    isSocket: result.sessionParameterInfo.isSocket,
    ipAddress: result.sessionParameterInfo.ipAddress,
    userAgent: result.sessionParameterInfo.userAgent,
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

function addSessionChangeInfoToResult(
  viewer: Viewer,
  res: $Response,
  result: Object,
  appURLFacts: AppURLFacts,
) {
  let threadInfos = {},
    userInfos = {};
  if (result.cookieChange) {
    ({ threadInfos, userInfos } = result.cookieChange);
  }
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
    }: ServerSessionChange);
  } else {
    sessionChange = ({
      cookieInvalidated: false,
      threadInfos,
      userInfos: (values(userInfos).map(a => a): UserInfo[]),
    }: ServerSessionChange);
  }
  if (viewer.cookieSource === cookieSources.BODY) {
    sessionChange.cookie = viewer.cookiePairString;
  } else {
    addActualHTTPCookie(viewer, res, appURLFacts);
  }
  if (viewer.sessionIdentifierType === sessionIdentifierTypes.BODY_SESSION_ID) {
    sessionChange.sessionID = viewer.sessionID ? viewer.sessionID : null;
  }
  result.cookieChange = sessionChange;
}

type AnonymousCookieCreationParams = Shape<{
  +platformDetails: ?PlatformDetails,
  +deviceToken: ?string,
}>;
const defaultPlatformDetails = {};

// The result of this function should not be passed directly to the Viewer
// constructor. Instead, it should be passed to viewer.setNewCookie. There are
// several fields on AnonymousViewerData that are not set by this function:
// sessionIdentifierType, cookieSource, ipAddress, and userAgent. These
// parameters all depend on the initial request. If the result of this function
// is passed to the Viewer constructor directly, the resultant Viewer object
// will throw whenever anybody attempts to access the relevant properties.
async function createNewAnonymousCookie(
  params: AnonymousCookieCreationParams,
): Promise<AnonymousViewerData> {
  const { platformDetails, deviceToken } = params;
  const { platform, ...versions } = platformDetails || defaultPlatformDetails;
  const versionsString =
    Object.keys(versions).length > 0 ? JSON.stringify(versions) : null;

  const time = Date.now();
  const cookiePassword = crypto.randomBytes(32).toString('hex');
  const cookieHash = bcrypt.hashSync(cookiePassword);
  const [[id]] = await Promise.all([
    createIDs('cookies', 1),
    deviceToken ? clearDeviceToken(deviceToken) : undefined,
  ]);

  const cookieRow = [
    id,
    cookieHash,
    null,
    platform,
    time,
    time,
    deviceToken,
    versionsString,
  ];
  const query = SQL`
    INSERT INTO cookies(id, hash, user, platform, creation_time, last_used,
      device_token, versions)
    VALUES ${[cookieRow]}
  `;
  await dbQuery(query);
  return {
    loggedIn: false,
    id,
    platformDetails,
    deviceToken,
    cookieID: id,
    cookiePassword,
    sessionID: undefined,
    sessionInfo: null,
    cookieInsertedThisRequest: true,
    isScriptViewer: false,
  };
}

type UserCookieCreationParams = {
  +platformDetails: PlatformDetails,
  +deviceToken?: ?string,
  +socialProof?: ?SIWESocialProof,
  +signedIdentityKeysBlob?: ?SignedIdentityKeysBlob,
};

// The result of this function should never be passed directly to the Viewer
// constructor. Instead, it should be passed to viewer.setNewCookie. There are
// several fields on UserViewerData that are not set by this function:
// sessionID, sessionIdentifierType, cookieSource, and ipAddress. These
// parameters all depend on the initial request. If the result of this function
// is passed to the Viewer constructor directly, the resultant Viewer object
// will throw whenever anybody attempts to access the relevant properties.
async function createNewUserCookie(
  userID: string,
  params: UserCookieCreationParams,
): Promise<UserViewerData> {
  const { platformDetails, deviceToken, socialProof, signedIdentityKeysBlob } =
    params;
  const { platform, ...versions } = platformDetails || defaultPlatformDetails;
  const versionsString =
    Object.keys(versions).length > 0 ? JSON.stringify(versions) : null;

  const time = Date.now();
  const cookiePassword = crypto.randomBytes(32).toString('hex');
  const cookieHash = bcrypt.hashSync(cookiePassword);
  const [[cookieID]] = await Promise.all([
    createIDs('cookies', 1),
    deviceToken ? clearDeviceToken(deviceToken) : undefined,
  ]);

  const cookieRow = [
    cookieID,
    cookieHash,
    userID,
    platform,
    time,
    time,
    deviceToken,
    versionsString,
    JSON.stringify(socialProof),
    signedIdentityKeysBlob ? JSON.stringify(signedIdentityKeysBlob) : null,
  ];
  const query = SQL`
    INSERT INTO cookies(id, hash, user, platform, creation_time, last_used,
      device_token, versions, social_proof, signed_identity_keys)
    VALUES ${[cookieRow]}
  `;
  await dbQuery(query);
  return {
    loggedIn: true,
    id: userID,
    platformDetails,
    deviceToken,
    userID,
    cookieID,
    sessionID: undefined,
    sessionInfo: null,
    cookiePassword,
    cookieInsertedThisRequest: true,
    isScriptViewer: false,
  };
}

// This gets called after createNewUserCookie and from websiteResponder. If the
// Viewer's sessionIdentifierType is COOKIE_ID then the cookieID is used as the
// session identifier; otherwise, a new ID is created for the session.
async function setNewSession(
  viewer: Viewer,
  calendarQuery: CalendarQuery,
  initialLastUpdate: number,
): Promise<void> {
  if (viewer.sessionIdentifierType !== sessionIdentifierTypes.COOKIE_ID) {
    const [sessionID] = await createIDs('sessions', 1);
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

function addCookieToJSONResponse(
  viewer: Viewer,
  res: $Response,
  result: Object,
  expectCookieInvalidation: boolean,
  appURLFacts: AppURLFacts,
) {
  if (expectCookieInvalidation) {
    viewer.cookieInvalidated = false;
  }
  if (!viewer.getData().cookieInsertedThisRequest) {
    handleAsyncPromise(extendCookieLifespan(viewer.cookieID));
  }
  if (viewer.sessionChanged) {
    addSessionChangeInfoToResult(viewer, res, result, appURLFacts);
  } else if (viewer.cookieSource !== cookieSources.BODY) {
    addActualHTTPCookie(viewer, res, appURLFacts);
  }
}

function addCookieToHomeResponse(
  viewer: Viewer,
  res: $Response,
  appURLFacts: AppURLFacts,
) {
  if (!viewer.getData().cookieInsertedThisRequest) {
    handleAsyncPromise(extendCookieLifespan(viewer.cookieID));
  }
  addActualHTTPCookie(viewer, res, appURLFacts);
}

function getCookieOptions(appURLFacts: AppURLFacts) {
  const { baseDomain, basePath, https } = appURLFacts;
  const domainAsURL = new url.URL(baseDomain);
  return {
    domain: domainAsURL.hostname,
    path: basePath,
    httpOnly: true,
    secure: https,
    maxAge: cookieLifetime,
    sameSite: 'Strict',
  };
}

function addActualHTTPCookie(
  viewer: Viewer,
  res: $Response,
  appURLFacts: AppURLFacts,
) {
  res.cookie(
    viewer.cookieName,
    viewer.cookieString,
    getCookieOptions(appURLFacts),
  );
  if (viewer.cookieName !== viewer.initialCookieName) {
    res.clearCookie(viewer.initialCookieName, getCookieOptions(appURLFacts));
  }
}

async function setCookiePlatform(
  viewer: Viewer,
  platform: Platform,
): Promise<void> {
  const newPlatformDetails = { ...viewer.platformDetails, platform };
  viewer.setPlatformDetails(newPlatformDetails);
  const query = SQL`
    UPDATE cookies
    SET platform = ${platform}
    WHERE id = ${viewer.cookieID}
  `;
  await dbQuery(query);
}

async function setCookiePlatformDetails(
  viewer: Viewer,
  platformDetails: PlatformDetails,
): Promise<void> {
  if (
    hasMinCodeVersion(platformDetails, 70) &&
    !hasMinCodeVersion(viewer.platformDetails, 70)
  ) {
    await updateThreadMembers(viewer);
  }

  viewer.setPlatformDetails(platformDetails);
  const { platform, ...versions } = platformDetails;
  const versionsString =
    Object.keys(versions).length > 0 ? JSON.stringify(versions) : null;
  const query = SQL`
    UPDATE cookies
    SET platform = ${platform}, versions = ${versionsString}
    WHERE id = ${viewer.cookieID}
  `;
  await dbQuery(query);
}

export {
  fetchViewerForJSONRequest,
  fetchViewerForHomeRequest,
  fetchViewerForSocket,
  createNewAnonymousCookie,
  createNewUserCookie,
  setNewSession,
  extendCookieLifespan,
  addCookieToJSONResponse,
  addCookieToHomeResponse,
  setCookiePlatform,
  setCookiePlatformDetails,
};
