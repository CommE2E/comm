// @flow

import type {
  LogOutResponse,
  DeleteAccountRequest,
} from 'lib/types/user-types';
import type { Viewer } from '../session/viewer';

import bcrypt from 'twin-bcrypt';

import { ServerError } from 'lib/utils/fetch-utils';

import { pool, SQL } from '../database';
import { createNewAnonymousCookie } from '../session/cookies';

async function deleteAccount(
  viewer: Viewer,
  request: DeleteAccountRequest,
): Promise<LogOutResponse> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const hashQuery = SQL`SELECT hash FROM users WHERE id = ${viewer.userID}`;
  const [ result ] = await pool.query(hashQuery);
  if (result.length === 0) {
    throw new ServerError('internal_error');
  }
  const row = result[0];
  if (!bcrypt.compareSync(request.password, row.hash)) {
    throw new ServerError('invalid_credentials');
  }

  // TODO figure out what to do with threads this account admins
  // TODO delete orphaned threads
  const deletionQuery = SQL`
    DELETE u, iu, v, iv, c, ic, m, f, n, ino
    FROM users u
    LEFT JOIN ids iu ON iu.id = u.id
    LEFT JOIN verifications v ON v.user = u.id
    LEFT JOIN ids iv ON iv.id = v.id
    LEFT JOIN cookies c ON c.user = u.id
    LEFT JOIN ids ic ON ic.id = c.id
    LEFT JOIN memberships m ON m.user = u.id
    LEFT JOIN focused f ON f.user = u.id
    LEFT JOIN notifications n ON n.user = u.id
    LEFT JOIN ids ino ON ino.id = n.id
    WHERE u.id = ${viewer.userID}
  `;
  const [ anonymousViewerData ] = await Promise.all([
    createNewAnonymousCookie(),
    pool.query(deletionQuery),
  ]);
  viewer.setNewCookie(anonymousViewerData);

  return {
    currentUserInfo: {
      id: viewer.id,
      anonymous: true,
    },
  };
}

export {
  deleteAccount,
};
