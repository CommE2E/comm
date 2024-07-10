// @flow

import crypto from 'crypto';
import type { $Response, $Request } from 'express';
import invariant from 'invariant';
import url from 'url';

import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';
import {
  type Platform,
  type PlatformDetails,
  isDeviceType,
} from 'lib/types/device-types.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import {
  type ServerSessionChange,
  cookieLifetime,
  cookieTypes,
  sessionIdentifierTypes,
  type SessionIdentifierType,
} from 'lib/types/session-types.js';
import type { SIWESocialProof } from 'lib/types/siwe-types.js';
import type { InitialClientSocketMessage } from 'lib/types/socket-types.js';
import type { UserInfo } from 'lib/types/user-types.js';
import { ignorePromiseRejections } from 'lib/utils/promises.js';

import {
  isBcryptHash,
  getCookieHash,
  verifyCookieHash,
} from './cookie-hash.js';
import { Viewer } from './viewer.js';
import type { AnonymousViewerData, UserViewerData } from './viewer.js';
import createIDs from '../creators/id-creator.js';
import { createSession } from '../creators/session-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { deleteCookie } from '../deleters/cookie-deleters.js';
import { clearDeviceToken } from '../updaters/device-token-updaters.js';
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
  | { +type: 'valid', +viewer: Viewer }
  | InvalidFetchViewerResult;

type InvalidFetchViewerResult =
  | {
      +type: 'nonexistant',
      +cookieName: ?string,
      +sessionParameterInfo: SessionParameterInfo,
    }
  | {
      +type: 'invalidated',
      +cookieName: string,
      +cookieID: string,
      +sessionParameterInfo: SessionParameterInfo,
      +platformDetails: ?PlatformDetails,
      +deviceToken: ?string,
    };

async function fetchUserViewer(
  cookie: string,
  sessionParameterInfo: SessionParameterInfo,
): Promise<FetchViewerResult> {
  const [cookieID, cookiePassword] = cookie.split(':');
  if (!cookieID || !cookiePassword) {
    return {
      type: 'nonexistant',
      cookieName: cookieTypes.USER,
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
      sessionParameterInfo,
    };
  }

  let sessionID = null,
    sessionInfo = null;
  if (allSessionInfo) {
    ({ sessionID, ...sessionInfo } = allSessionInfo);
  }

  const cookieRow = result[0];
  let platformDetails;
  let versions = null;
  if (cookieRow.versions) {
    versions = JSON.parse(cookieRow.versions);
    platformDetails = {
      platform: cookieRow.platform,
      codeVersion: versions.codeVersion,
      stateVersion: versions.stateVersion,
    };
  } else {
    platformDetails = { platform: cookieRow.platform };
  }

  if (versions && versions.majorDesktopVersion) {
    platformDetails = {
      ...platformDetails,
      majorDesktopVersion: versions.majorDesktopVersion,
    };
  }

  const deviceToken = cookieRow.device_token;
  const cookieHash = cookieRow.hash;

  if (
    !verifyCookieHash(cookiePassword, cookieHash) ||
    cookieIsExpired(cookieRow.last_used)
  ) {
    return {
      type: 'invalidated',
      cookieName: cookieTypes.USER,
      cookieID,
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
    cookieID,
    cookiePassword,
    cookieHash,
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
  sessionParameterInfo: SessionParameterInfo,
): Promise<FetchViewerResult> {
  const [cookieID, cookiePassword] = cookie.split(':');
  if (!cookieID || !cookiePassword) {
    return {
      type: 'nonexistant',
      cookieName: cookieTypes.ANONYMOUS,
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
  let versions = null;
  if (cookieRow.platform && cookieRow.versions) {
    versions = JSON.parse(cookieRow.versions);
    platformDetails = {
      platform: cookieRow.platform,
      codeVersion: versions.codeVersion,
      stateVersion: versions.stateVersion,
    };
  } else if (cookieRow.platform) {
    platformDetails = { platform: cookieRow.platform };
  }

  if (platformDetails && versions && versions.majorDesktopVersion) {
    platformDetails = {
      ...platformDetails,
      majorDesktopVersion: versions.majorDesktopVersion,
    };
  }

  const deviceToken = cookieRow.device_token;
  const cookieHash = cookieRow.hash;

  if (
    !verifyCookieHash(cookiePassword, cookieHash) ||
    cookieIsExpired(cookieRow.last_used)
  ) {
    return {
      type: 'invalidated',
      cookieName: cookieTypes.ANONYMOUS,
      cookieID,
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
    cookieID,
    cookiePassword,
    cookieHash,
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

async function fetchViewerFromRequestBody(
  body: mixed,
  sessionParameterInfo: SessionParameterInfo,
): Promise<FetchViewerResult> {
  if (!body || typeof body !== 'object') {
    return {
      type: 'nonexistant',
      cookieName: null,
      sessionParameterInfo,
    };
  }
  const cookiePair = body.cookie;
  if (cookiePair === null || cookiePair === '') {
    return {
      type: 'nonexistant',
      cookieName: null,
      sessionParameterInfo,
    };
  }
  if (!cookiePair || typeof cookiePair !== 'string') {
    return {
      type: 'nonexistant',
      cookieName: null,
      sessionParameterInfo,
    };
  }
  const [type, cookie] = cookiePair.split('=');
  if (type === cookieTypes.USER && cookie) {
    return await fetchUserViewer(cookie, sessionParameterInfo);
  } else if (type === cookieTypes.ANONYMOUS && cookie) {
    return await fetchAnonymousViewer(cookie, sessionParameterInfo);
  }
  return {
    type: 'nonexistant',
    cookieName: null,
    sessionParameterInfo,
  };
}

function getRequestIPAddress(req: $Request) {
  const { proxy } = getAppURLFactsFromRequestURL(req.originalUrl);
  let ipAddress;
  if (proxy === 'none') {
    ipAddress = req.socket.remoteAddress;
  } else if (proxy === 'apache' || proxy === 'aws') {
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
  const result = await fetchViewerFromRequestBody(
    req.body,
    sessionParameterInfo,
  );
  return await handleFetchViewerResult(result);
}

async function fetchViewerForSocket(
  req: $Request,
  clientMessage: InitialClientSocketMessage,
): Promise<Viewer> {
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

  const result = await fetchViewerFromRequestBody(
    clientMessage.payload.sessionIdentification,
    sessionParameterInfo,
  );
  if (result.type === 'valid') {
    return result.viewer;
  }

  const anonymousViewerDataPromise: Promise<AnonymousViewerData> =
    (async () => {
      const platformDetails =
        result.type === 'invalidated' ? result.platformDetails : null;
      const deviceToken =
        result.type === 'invalidated' ? result.deviceToken : null;
      return await createNewAnonymousCookie({
        platformDetails,
        deviceToken,
      });
    })();
  const deleteCookiePromise = (async () => {
    if (result.type === 'invalidated') {
      await deleteCookie(result.cookieID);
    }
  })();
  const [anonymousViewerData] = await Promise.all([
    anonymousViewerDataPromise,
    deleteCookiePromise,
  ]);

  return createViewerForInvalidFetchViewerResult(result, anonymousViewerData);
}

async function handleFetchViewerResult(
  result: FetchViewerResult,
  inputPlatformDetails?: PlatformDetails,
) {
  if (result.type === 'valid') {
    return result.viewer;
  }

  let platformDetails: ?PlatformDetails = inputPlatformDetails;
  if (!platformDetails && result.type === 'invalidated') {
    platformDetails = result.platformDetails;
  }
  const deviceToken = result.type === 'invalidated' ? result.deviceToken : null;

  const deleteCookiePromise = (async () => {
    if (result.type === 'invalidated') {
      await deleteCookie(result.cookieID);
    }
  })();

  const [anonymousViewerData] = await Promise.all([
    createNewAnonymousCookie({ platformDetails, deviceToken }),
    deleteCookiePromise,
  ]);

  return createViewerForInvalidFetchViewerResult(result, anonymousViewerData);
}

function createViewerForInvalidFetchViewerResult(
  result: InvalidFetchViewerResult,
  anonymousViewerData: AnonymousViewerData,
): Viewer {
  const viewer = new Viewer({
    ...anonymousViewerData,
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
) {
  let threadInfos = {},
    userInfos: $ReadOnlyArray<UserInfo> = [];
  if (result.cookieChange) {
    ({ threadInfos, userInfos } = result.cookieChange);
  }
  let sessionChange;
  if (viewer.cookieInvalidated) {
    sessionChange = ({
      cookieInvalidated: true,
      threadInfos,
      userInfos,
      currentUserInfo: {
        anonymous: true,
      },
    }: ServerSessionChange);
  } else {
    sessionChange = ({
      cookieInvalidated: false,
      threadInfos,
      userInfos,
    }: ServerSessionChange);
  }
  sessionChange.cookie = viewer.cookiePairString;
  if (viewer.sessionIdentifierType === sessionIdentifierTypes.BODY_SESSION_ID) {
    sessionChange.sessionID = viewer.sessionID ? viewer.sessionID : null;
  }
  result.cookieChange = sessionChange;
}

type AnonymousCookieCreationParams = Partial<{
  +platformDetails: ?PlatformDetails,
  +deviceToken: ?string,
}>;
const defaultPlatformDetails = {};

// The result of this function should not be passed directly to the Viewer
// constructor. Instead, it should be passed to viewer.setNewCookie. There are
// several fields on AnonymousViewerData that are not set by this function:
// sessionIdentifierType, ipAddress, and userAgent. These parameters all depend
// on the initial request. If the result of this function is passed to the
// Viewer constructor directly, the resultant Viewer object will throw whenever
// anybody attempts to access the relevant properties.
async function createNewAnonymousCookie(
  params: AnonymousCookieCreationParams,
): Promise<AnonymousViewerData> {
  const { platformDetails, deviceToken } = params;
  const { platform, ...versions } = platformDetails || defaultPlatformDetails;
  const versionsString =
    Object.keys(versions).length > 0 ? JSON.stringify(versions) : null;

  const time = Date.now();
  const cookiePassword = crypto.randomBytes(32).toString('hex');
  const cookieHash = getCookieHash(cookiePassword);
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
    cookieHash,
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
// sessionID, sessionIdentifierType, and ipAddress. These parameters all depend
// on the initial request. If the result of this function is passed to the
// Viewer constructor directly, the resultant Viewer object will throw whenever
// anybody attempts to access the relevant properties.
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
  const cookieHash = getCookieHash(cookiePassword);
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
    cookieHash,
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

async function updateCookie(viewer: Viewer) {
  const time = Date.now();
  const { cookieID, cookieHash, cookiePassword } = viewer;

  const updateObj: { [string]: string | number } = {};
  updateObj.last_used = time;
  if (isBcryptHash(cookieHash)) {
    updateObj.hash = getCookieHash(cookiePassword);
  }
  const query = SQL`
    UPDATE cookies SET ${updateObj} WHERE id = ${cookieID}
  `;
  await dbQuery(query);
}

function addCookieToJSONResponse(
  viewer: Viewer,
  res: $Response,
  result: Object,
  expectCookieInvalidation: boolean,
) {
  if (expectCookieInvalidation) {
    viewer.cookieInvalidated = false;
  }
  if (!viewer.getData().cookieInsertedThisRequest) {
    ignorePromiseRejections(updateCookie(viewer));
  }
  if (viewer.sessionChanged) {
    addSessionChangeInfoToResult(viewer, res, result);
  }
}

function addCookieToHomeResponse(
  req: $Request,
  res: $Response,
  appURLFacts: AppURLFacts,
) {
  const { user, anonymous } = req.cookies;
  if (user) {
    res.cookie(cookieTypes.USER, user, getCookieOptions(appURLFacts));
  }
  if (anonymous) {
    res.cookie(cookieTypes.ANONYMOUS, anonymous, getCookieOptions(appURLFacts));
  }
}

function getCookieOptions(appURLFacts: AppURLFacts) {
  const { baseDomain, basePath, https } = appURLFacts;
  const domainAsURL = new url.URL(baseDomain);
  return {
    domain: domainAsURL.hostname,
    path: basePath,
    httpOnly: false,
    secure: https,
    maxAge: cookieLifetime,
    sameSite: 'Strict',
  };
}

async function setCookieSignedIdentityKeysBlob(
  cookieID: string,
  signedIdentityKeysBlob: SignedIdentityKeysBlob,
) {
  const signedIdentityKeysStr = JSON.stringify(signedIdentityKeysBlob);
  const query = SQL`
    UPDATE cookies 
    SET signed_identity_keys = ${signedIdentityKeysStr}
    WHERE id = ${cookieID}
  `;
  await dbQuery(query);
}

// Returns `true` if row with `id = cookieID` exists AND
// `signed_identity_keys` is `NULL`. Otherwise, returns `false`.
async function isCookieMissingSignedIdentityKeysBlob(
  cookieID: string,
): Promise<boolean> {
  const query = SQL`
    SELECT signed_identity_keys
    FROM cookies 
    WHERE id = ${cookieID}
  `;
  const [queryResult] = await dbQuery(query);
  return (
    queryResult.length === 1 && queryResult[0].signed_identity_keys === null
  );
}

async function isCookieMissingOlmNotificationsSession(
  viewer: Viewer,
): Promise<boolean> {
  const isDeviceSupportingE2ENotifs =
    isDeviceType(viewer.platformDetails?.platform) &&
    hasMinCodeVersion(viewer.platformDetails, { native: 222 });

  const isWebSupportingE2ENotifs =
    viewer.platformDetails?.platform === 'web' &&
    hasMinCodeVersion(viewer.platformDetails, { web: 43 });

  const isMacOSSupportingE2ENotifs =
    viewer.platformDetails?.platform === 'macos' &&
    hasMinCodeVersion(viewer.platformDetails, { web: 43, majorDesktop: 9 });

  const isWindowsSupportingE2ENotifs =
    viewer.platformDetails?.platform === 'windows' &&
    hasMinCodeVersion(viewer.platformDetails, {
      majorDesktop: 10,
    });

  if (
    !isDeviceSupportingE2ENotifs &&
    !isWebSupportingE2ENotifs &&
    !isMacOSSupportingE2ENotifs &&
    !isWindowsSupportingE2ENotifs
  ) {
    return false;
  }
  const query = SQL`
    SELECT COUNT(*) AS count
    FROM olm_sessions
    WHERE cookie_id = ${viewer.cookieID} AND is_content = FALSE
  `;
  const [queryResult] = await dbQuery(query);
  return queryResult[0].count === 0;
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
  fetchViewerForSocket,
  createNewAnonymousCookie,
  createNewUserCookie,
  setNewSession,
  updateCookie,
  addCookieToJSONResponse,
  addCookieToHomeResponse,
  setCookieSignedIdentityKeysBlob,
  isCookieMissingSignedIdentityKeysBlob,
  setCookiePlatform,
  setCookiePlatformDetails,
  isCookieMissingOlmNotificationsSession,
};
