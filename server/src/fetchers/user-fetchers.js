// @flow

import type {
  UserInfos,
  CurrentUserInfo,
  LoggedInUserInfo,
} from 'lib/types/user-types';
import type { Viewer } from '../session/viewer';

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database';

async function fetchUserInfos(userIDs: string[]): Promise<UserInfos> {
  if (userIDs.length <= 0) {
    return {};
  }

  const query = SQL`
    SELECT id, username FROM users WHERE id IN (${userIDs})
  `;
  const [result] = await dbQuery(query);

  const userInfos = {};
  for (let row of result) {
    const id = row.id.toString();
    userInfos[id] = {
      id,
      username: row.username,
    };
  }
  for (let userID of userIDs) {
    if (!userInfos[userID]) {
      userInfos[userID] = {
        id: userID,
        username: null,
      };
    }
  }

  return userInfos;
}

async function fetchKnownUserInfos(viewer: Viewer) {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }
  const query = SQL`
    SELECT DISTINCT id, username FROM relationships_undirected r 
    LEFT JOIN users u ON r.user1 = u.id OR r.user2 = u.id 
    WHERE (r.user1 = ${viewer.userID} OR r.user2 = ${viewer.userID})
  `;
  const [result] = await dbQuery(query);

  const userInfos = {};
  for (let row of result) {
    const id = row.id.toString();
    userInfos[id] = {
      id,
      username: row.username,
    };
  }

  return userInfos;
}

async function verifyUserIDs(
  userIDs: $ReadOnlyArray<string>,
): Promise<string[]> {
  if (userIDs.length === 0) {
    return [];
  }
  const query = SQL`SELECT id FROM users WHERE id IN (${userIDs})`;
  const [result] = await dbQuery(query);
  return result.map(row => row.id.toString());
}

async function verifyUserOrCookieIDs(
  ids: $ReadOnlyArray<string>,
): Promise<string[]> {
  if (ids.length === 0) {
    return [];
  }
  const query = SQL`
    SELECT id FROM users WHERE id IN (${ids})
    UNION SELECT id FROM cookies WHERE id IN (${ids})
  `;
  const [result] = await dbQuery(query);
  return result.map(row => row.id.toString());
}

async function fetchCurrentUserInfo(viewer: Viewer): Promise<CurrentUserInfo> {
  if (!viewer.loggedIn) {
    return { id: viewer.cookieID, anonymous: true };
  }
  const currentUserInfos = await fetchLoggedInUserInfos([viewer.userID]);
  if (currentUserInfos.length === 0) {
    throw new ServerError('unknown_error');
  }
  return currentUserInfos[0];
}

async function fetchLoggedInUserInfos(
  userIDs: $ReadOnlyArray<string>,
): Promise<LoggedInUserInfo[]> {
  const query = SQL`
    SELECT id, username, email, email_verified
    FROM users
    WHERE id IN (${userIDs})
  `;
  const [result] = await dbQuery(query);
  return result.map(row => ({
    id: row.id.toString(),
    username: row.username,
    email: row.email,
    emailVerified: !!row.email_verified,
  }));
}

async function fetchAllUserIDs(): Promise<string[]> {
  const query = SQL`SELECT id FROM users`;
  const [result] = await dbQuery(query);
  return result.map(row => row.id.toString());
}

async function fetchUsername(id: string): Promise<?string> {
  const query = SQL`SELECT username FROM users WHERE id = ${id}`;
  const [result] = await dbQuery(query);
  if (result.length === 0) {
    return null;
  }
  const row = result[0];
  return row.username;
}

export {
  fetchUserInfos,
  verifyUserIDs,
  verifyUserOrCookieIDs,
  fetchCurrentUserInfo,
  fetchLoggedInUserInfos,
  fetchAllUserIDs,
  fetchUsername,
  fetchKnownUserInfos,
};
