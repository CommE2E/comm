// @flow

import { getRustAPI } from 'rust-node-addon';
import bcrypt from 'twin-bcrypt';

import type {
  LogOutResponse,
  DeleteAccountRequest,
} from 'lib/types/account-types.js';
import { updateTypes } from 'lib/types/update-types.js';
import type { UserInfo } from 'lib/types/user-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import { promiseAll } from 'lib/utils/promises.js';

import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { fetchKnownUserInfos } from '../fetchers/user-fetchers.js';
import { rescindPushNotifs } from '../push/rescind.js';
import { handleAsyncPromise } from '../responders/handlers.js';
import { createNewAnonymousCookie } from '../session/cookies.js';
import type { Viewer } from '../session/viewer.js';

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
    const requestPasswordConsistentWithDB = !!row.hash === !!request.password;
    const shouldValidatePassword = !!row.hash;
    if (
      !requestPasswordConsistentWithDB ||
      (shouldValidatePassword &&
        !bcrypt.compareSync(request.password, row.hash))
    ) {
      throw new ServerError('invalid_credentials');
    }
  }

  const deletedUserID = viewer.userID;
  await rescindPushNotifs(SQL`n.user = ${deletedUserID}`, SQL`NULL`);
  const rustAPIPromise = getRustAPI();
  const knownUserInfos = await fetchKnownUserInfos(viewer);
  const usersToUpdate = values(knownUserInfos).filter(
    userID => userID !== deletedUserID,
  );

  // TODO: if this results in any orphaned orgs, convert them to chats
  const deletionQuery = SQL`
    START TRANSACTION;
    DELETE FROM users WHERE id = ${deletedUserID};
    DELETE FROM ids WHERE id = ${deletedUserID};
    DELETE c, i
      FROM cookies c
      LEFT JOIN ids i ON i.id = c.id
      WHERE c.user = ${deletedUserID};
    DELETE FROM memberships WHERE user = ${deletedUserID};
    DELETE FROM focused WHERE user = ${deletedUserID};
    DELETE n, i
      FROM notifications n
      LEFT JOIN ids i ON i.id = n.id
      WHERE n.user = ${deletedUserID};
    DELETE u, i
      FROM updates u
      LEFT JOIN ids i ON i.id = u.id
      WHERE u.user = ${deletedUserID};
    DELETE s, i
      FROM sessions s
      LEFT JOIN ids i ON i.id = s.id
      WHERE s.user = ${deletedUserID};
    DELETE r, i
      FROM reports r
      LEFT JOIN ids i ON i.id = r.id
      WHERE r.user = ${deletedUserID};
    DELETE FROM relationships_undirected WHERE user1 = ${deletedUserID};
    DELETE FROM relationships_undirected WHERE user2 = ${deletedUserID};
    DELETE FROM relationships_directed WHERE user1 = ${deletedUserID};
    DELETE FROM relationships_directed WHERE user2 = ${deletedUserID};
    COMMIT;
  `;

  const promises = {};
  promises.deletion = dbQuery(deletionQuery, { multipleStatements: true });
  if (request) {
    promises.anonymousViewerData = createNewAnonymousCookie({
      platformDetails: viewer.platformDetails,
      deviceToken: viewer.deviceToken,
    });
  }
  promises.rustAPI = rustAPIPromise;
  const { anonymousViewerData, rustAPI } = await promiseAll(promises);
  handleAsyncPromise(rustAPI.deleteUser(deletedUserID));
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
