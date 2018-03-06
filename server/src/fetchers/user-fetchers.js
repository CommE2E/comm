// @flow

import type { UserInfos, CurrentUserInfo } from 'lib/types/user-types';
import type { Viewer } from '../session/viewer';

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database';

async function fetchUserInfos(
  userIDs: string[],
): Promise<UserInfos> {
  if (userIDs.length <= 0) {
    return {};
  }

  const query = SQL`
    SELECT id, username FROM users WHERE id IN (${userIDs})
  `;
  const [ result ] = await dbQuery(query);

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

async function verifyUserIDs(
  userIDs: $ReadOnlyArray<string>,
): Promise<string[]> {
  if (userIDs.length === 0) {
    return [];
  }
  const query = SQL`SELECT id FROM users WHERE id IN (${userIDs})`;
  const [ result ] = await dbQuery(query);
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
  const [ result ] = await dbQuery(query);
  return result.map(row => row.id.toString());
}

async function fetchCurrentUserInfo(
  viewer: Viewer,
): Promise<CurrentUserInfo> {
  if (!viewer.loggedIn) {
    return { id: viewer.cookieID, anonymous: true };
  }

  const query = SQL`
    SELECT username, email, email_verified
    FROM users
    WHERE id = ${viewer.userID}
  `;
  const [ result ] = await dbQuery(query);
  if (result.length === 0) {
    throw new ServerError('unknown_error');
  }
  const row = result[0];
  return {
    id: viewer.userID,
    username: row.username,
    email: row.email,
    emailVerified: !!row.email_verified,
  };
}

export {
  fetchUserInfos,
  verifyUserIDs,
  verifyUserOrCookieIDs,
  fetchCurrentUserInfo,
};
