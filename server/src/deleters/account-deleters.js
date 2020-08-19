// @flow

import type {
  LogOutResponse,
  DeleteAccountRequest,
} from 'lib/types/account-types';
import type { Viewer } from '../session/viewer';
import { updateTypes } from 'lib/types/update-types';

import bcrypt from 'twin-bcrypt';

import { ServerError } from 'lib/utils/errors';
import { promiseAll } from 'lib/utils/promises';

import { dbQuery, SQL } from '../database';
import { createNewAnonymousCookie } from '../session/cookies';
import { fetchAllUserIDs } from '../fetchers/user-fetchers';
import { createUpdates } from '../creators/update-creator';
import { handleAsyncPromise } from '../responders/handlers';
import { rescindPushNotifs } from '../push/rescind';

async function deleteAccount(
  viewer: Viewer,
  request?: DeleteAccountRequest,
): Promise<?LogOutResponse> {
  if (!viewer.loggedIn || (!request && !viewer.isScriptViewer)) {
    throw new ServerError('not_logged_in');
  }

  if (request) {
    const hashQuery = SQL`SELECT hash FROM users WHERE id = ${viewer.userID}`;
    const [result] = await dbQuery(hashQuery);
    if (result.length === 0) {
      throw new ServerError('internal_error');
    }
    const row = result[0];
    if (!bcrypt.compareSync(request.password, row.hash)) {
      throw new ServerError('invalid_credentials');
    }
  }

  const deletedUserID = viewer.userID;
  await rescindPushNotifs(SQL`n.user = ${deletedUserID}`, SQL`NULL`);

  // TODO: if this results in any orphaned orgs, convert them to chats
  const deletionQuery = SQL`
    DELETE u, iu, v, iv, c, ic, m, f, n, ino, up, iup, s, si, ru, rd
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
    LEFT JOIN updates up ON up.user = u.id
    LEFT JOIN ids iup ON iup.id = up.id
    LEFT JOIN sessions s ON u.id = s.user
    LEFT JOIN ids si ON si.id = s.id
    LEFT JOIN relationships_undirected ru ON (ru.user1 = u.id OR ru.user2 = u.id)
    LEFT JOIN relationships_directed rd ON (rd.user1 = u.id OR rd.user2 = u.id)
    WHERE u.id = ${deletedUserID}
  `;

  const promises = {};
  promises.deletion = dbQuery(deletionQuery);
  if (request) {
    promises.anonymousViewerData = createNewAnonymousCookie({
      platformDetails: viewer.platformDetails,
      deviceToken: viewer.deviceToken,
    });
  }
  const { anonymousViewerData } = await promiseAll(promises);
  if (anonymousViewerData) {
    viewer.setNewCookie(anonymousViewerData);
  }

  const deletionUpdatesPromise = createAccountDeletionUpdates(deletedUserID);
  if (request) {
    handleAsyncPromise(deletionUpdatesPromise);
  } else {
    await deletionUpdatesPromise;
  }

  if (request) {
    return {
      currentUserInfo: {
        id: viewer.id,
        anonymous: true,
      },
    };
  }
  return null;
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

export { deleteAccount };
