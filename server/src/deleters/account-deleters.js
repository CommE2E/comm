// @flow

import type {
  LogOutResponse,
  DeleteAccountRequest,
} from 'lib/types/account-types';
import type { Viewer } from '../session/viewer';
import type { UserInfo } from 'lib/types/user-types';
import { updateTypes } from 'lib/types/update-types';

import bcrypt from 'twin-bcrypt';

import { ServerError } from 'lib/utils/errors';
import { promiseAll } from 'lib/utils/promises';
import { values } from 'lib/utils/objects';

import { dbQuery, SQL } from '../database/database';
import { createNewAnonymousCookie } from '../session/cookies';
import { fetchKnownUserInfos } from '../fetchers/user-fetchers';
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
  const knownUserInfos = await fetchKnownUserInfos(viewer);
  const usersToUpdate = values(knownUserInfos).filter(
    (userID) => userID !== deletedUserID,
  );

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

  const deletionUpdatesPromise = createAccountDeletionUpdates(
    usersToUpdate,
    deletedUserID,
  );
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
  knownUserInfos: $ReadOnlyArray<UserInfo>,
  deletedUserID: string,
): Promise<void> {
  const time = Date.now();
  const updateDatas = [];
  for (const userInfo of knownUserInfos) {
    const { id: userID } = userInfo;
    updateDatas.push({
      type: updateTypes.DELETE_ACCOUNT,
      userID,
      time,
      deletedUserID,
    });
  }
  await createUpdates(updateDatas);
}

export { deleteAccount };
