// @flow

import { getRustAPI } from 'rust-node-addon';

import type { LogOutResponse } from 'lib/types/account-types.js';
import type { ReservedUsernameMessage } from 'lib/types/crypto-types.js';
import { updateTypes } from 'lib/types/update-types-enum.js';
import type { UserInfo } from 'lib/types/user-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import { promiseAll } from 'lib/utils/promises.js';

import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import {
  fetchKnownUserInfos,
  fetchUsername,
} from '../fetchers/user-fetchers.js';
import { rescindPushNotifs } from '../push/rescind.js';
import { handleAsyncPromise } from '../responders/handlers.js';
import { createNewAnonymousCookie } from '../session/cookies.js';
import type { Viewer } from '../session/viewer.js';
import { fetchOlmAccount } from '../updaters/olm-account-updater.js';

async function deleteAccount(viewer: Viewer): Promise<?LogOutResponse> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const deletedUserID = viewer.userID;
  await rescindPushNotifs(SQL`n.user = ${deletedUserID}`, SQL`NULL`);
  const knownUserInfos = await fetchKnownUserInfos(viewer);
  const usersToUpdate: $ReadOnlyArray<UserInfo> = values(knownUserInfos).filter(
    (user: UserInfo): boolean => user.id !== deletedUserID,
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
    DELETE u, i
      FROM uploads u
      LEFT JOIN ids i on i.id = u.id
      WHERE u.container = ${deletedUserID};
    DELETE FROM relationships_undirected WHERE user1 = ${deletedUserID};
    DELETE FROM relationships_undirected WHERE user2 = ${deletedUserID};
    DELETE FROM relationships_directed WHERE user1 = ${deletedUserID};
    DELETE FROM relationships_directed WHERE user2 = ${deletedUserID};
    COMMIT;
  `;

  const promises = {};
  promises.deletion = dbQuery(deletionQuery, { multipleStatements: true });
  if (!viewer.isScriptViewer) {
    promises.anonymousViewerData = createNewAnonymousCookie({
      platformDetails: viewer.platformDetails,
      deviceToken: viewer.deviceToken,
    });
  }
  promises.username = fetchUsername(deletedUserID);
  const { anonymousViewerData, username } = await promiseAll(promises);
  if (username) {
    const issuedAt = new Date().toISOString();
    const reservedUsernameMessage: ReservedUsernameMessage = {
      statement: 'Remove the following username from reserved list',
      payload: username,
      issuedAt,
    };
    const message = JSON.stringify(reservedUsernameMessage);

    handleAsyncPromise(
      (async () => {
        const rustAPI = await getRustAPI();
        const accountInfo = await fetchOlmAccount('content');
        const signature = accountInfo.account.sign(message);
        await rustAPI.removeReservedUsername(message, signature);
      })(),
    );
  }

  if (anonymousViewerData) {
    viewer.setNewCookie(anonymousViewerData);
  }

  const deletionUpdatesPromise = createAccountDeletionUpdates(
    usersToUpdate,
    deletedUserID,
  );
  if (viewer.isScriptViewer) {
    await deletionUpdatesPromise;
  } else {
    handleAsyncPromise(deletionUpdatesPromise);
  }

  if (viewer.isScriptViewer) {
    return null;
  }
  return {
    currentUserInfo: {
      id: viewer.id,
      anonymous: true,
    },
  };
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
