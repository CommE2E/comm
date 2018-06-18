// @flow

import type {
  LogOutResponse,
  DeleteAccountRequest,
} from 'lib/types/account-types';
import type { Viewer } from '../session/viewer';
import { updateTypes } from 'lib/types/update-types';

import bcrypt from 'twin-bcrypt';

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database';
import { createNewAnonymousCookie } from '../session/cookies';
import { fetchAllUserIDs } from '../fetchers/user-fetchers';
import { createUpdates } from '../creators/update-creator';

async function deleteAccount(
  viewer: Viewer,
  request: DeleteAccountRequest,
): Promise<LogOutResponse> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const hashQuery = SQL`SELECT hash FROM users WHERE id = ${viewer.userID}`;
  const [ result ] = await dbQuery(hashQuery);
  if (result.length === 0) {
    throw new ServerError('internal_error');
  }
  const row = result[0];
  if (!bcrypt.compareSync(request.password, row.hash)) {
    throw new ServerError('invalid_credentials');
  }

  // TODO: if this results in any orphaned orgs, convert them to chats
  const deletedUserID = viewer.userID;
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
    WHERE u.id = ${deletedUserID}
  `;
  const [ anonymousViewerData ] = await Promise.all([
    createNewAnonymousCookie(viewer.platform),
    dbQuery(deletionQuery),
  ]);
  viewer.setNewCookie(anonymousViewerData);

  createAccountDeletionUpdates(deletedUserID);

  return {
    currentUserInfo: {
      id: viewer.id,
      anonymous: true,
    },
  };
}

async function createAccountDeletionUpdates(
  deletedUserID: string,
): Promise<void> {
  const allUserIDs = await fetchAllUserIDs();
  const time = Date.now();
  const updateDatas = allUserIDs.map(userID => ({
    type: updateTypes.DELETE_ACCOUNT,
    userID,
    time,
    deletedUserID,
  }));
  await createUpdates(updateDatas);
}

export {
  deleteAccount,
};
