// @flow

import {
  type ThreadDeletionRequest,
  type LeaveThreadResult,
  threadTypes,
  threadPermissions,
} from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';
import { updateTypes } from 'lib/types/update-types';

import bcrypt from 'twin-bcrypt';

import { ServerError } from 'lib/utils/errors';
import { permissionLookup } from 'lib/permissions/thread-permissions';

import { dbQuery, SQL } from '../database';
import {
  fetchThreadPermissionsBlob,
  fetchThreadInfos,
  fetchServerThreadInfos,
} from '../fetchers/thread-fetchers';
import { rescindPushNotifs } from '../push/rescind';
import { createUpdates } from '../creators/update-creator';
import { fetchUpdateInfoForThreadDeletion } from '../fetchers/update-fetchers';

async function deleteThread(
  viewer: Viewer,
  threadDeletionRequest: ThreadDeletionRequest,
): Promise<LeaveThreadResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }
  const { threadID } = threadDeletionRequest;

  const [
    permissionsBlob,
    [hashResult],
    { threadInfos: serverThreadInfos },
  ] = await Promise.all([
    fetchThreadPermissionsBlob(viewer, threadID),
    dbQuery(SQL`SELECT hash FROM users WHERE id = ${viewer.userID}`),
    fetchServerThreadInfos(SQL`t.id = ${threadID}`),
  ]);

  if (!permissionsBlob) {
    // This should only occur if the first request goes through but the client
    // never receives the response
    const [{ threadInfos }, { updateInfos }] = await Promise.all([
      fetchThreadInfos(viewer),
      fetchUpdateInfoForThreadDeletion(viewer, threadID),
    ]);
    return {
      threadInfos,
      updatesResult: {
        newUpdates: updateInfos,
      },
    };
  }

  const hasPermission = permissionLookup(
    permissionsBlob,
    threadPermissions.DELETE_THREAD,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }
  if (hashResult.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const row = hashResult[0];
  if (!bcrypt.compareSync(threadDeletionRequest.accountPassword, row.hash)) {
    throw new ServerError('invalid_credentials');
  }

  await rescindPushNotifs(
    SQL`n.thread = ${threadID}`,
    SQL`IF(m.thread = ${threadID}, NULL, m.thread)`,
  );

  // TODO: if org, delete all descendant threads as well. make sure to warn user
  // TODO: handle descendant thread permission update correctly.
  //       thread-permission-updaters should be used for descendant threads.
  const query = SQL`
    DELETE t, ic, d, id, e, ie, re, ire, mm, r, ms, im, up, iu, f, n, ino
    FROM threads t
    LEFT JOIN ids ic ON ic.id = t.id
    LEFT JOIN days d ON d.thread = t.id
    LEFT JOIN ids id ON id.id = d.id
    LEFT JOIN entries e ON e.day = d.id
    LEFT JOIN ids ie ON ie.id = e.id
    LEFT JOIN revisions re ON re.entry = e.id
    LEFT JOIN ids ire ON ire.id = re.id
    LEFT JOIN memberships mm ON mm.thread = t.id
    LEFT JOIN roles r ON r.thread = t.id
    LEFT JOIN ids ir ON ir.id = r.id
    LEFT JOIN messages ms ON ms.thread = t.id
    LEFT JOIN ids im ON im.id = ms.id
    LEFT JOIN uploads up ON up.container = ms.id
    LEFT JOIN ids iu ON iu.id = up.id
    LEFT JOIN focused f ON f.thread = t.id
    LEFT JOIN notifications n ON n.thread = t.id
    LEFT JOIN ids ino ON ino.id = n.id
    WHERE t.id = ${threadID}
  `;

  const serverThreadInfo = serverThreadInfos[threadID];
  const time = Date.now();
  const updateDatas = [];
  for (let memberInfo of serverThreadInfo.members) {
    updateDatas.push({
      type: updateTypes.DELETE_THREAD,
      userID: memberInfo.id,
      time,
      threadID,
    });
  }

  const [{ viewerUpdates }] = await Promise.all([
    createUpdates(updateDatas, { viewer, updatesForCurrentSession: 'return' }),
    dbQuery(query),
  ]);

  const { threadInfos } = await fetchThreadInfos(viewer);
  return {
    threadInfos,
    updatesResult: {
      newUpdates: viewerUpdates,
    },
  };
}

async function deleteInaccessibleThreads(): Promise<void> {
  // A thread is considered "inaccessible" if it has no members and either has
  // no parent or is a "secret" thread. In orgs where admins can see "secret"
  // threads, an "inaccessible" thread may technically be accessible by an
  // admin, but we will delete it anyways
  await dbQuery(SQL`
    DELETE t, i, d, id, e, ie, re, ire, r, ir, ms, im, up, iu, f, n, ino
    FROM threads t
    LEFT JOIN ids i ON i.id = t.id
    LEFT JOIN memberships m ON m.thread = t.id
    LEFT JOIN days d ON d.thread = t.id
    LEFT JOIN ids id ON id.id = d.id
    LEFT JOIN entries e ON e.day = d.id
    LEFT JOIN ids ie ON ie.id = e.id
    LEFT JOIN revisions re ON re.entry = e.id
    LEFT JOIN ids ire ON ire.id = re.id
    LEFT JOIN roles r ON r.thread = t.id
    LEFT JOIN ids ir ON ir.id = r.id
    LEFT JOIN messages ms ON ms.thread = t.id
    LEFT JOIN ids im ON im.id = ms.id
    LEFT JOIN uploads up ON up.container = ms.id
    LEFT JOIN ids iu ON iu.id = up.id
    LEFT JOIN focused f ON f.thread = t.id
    LEFT JOIN notifications n ON n.thread = t.id
    LEFT JOIN ids ino ON ino.id = n.id
    WHERE m.thread IS NULL AND
      (t.parent_thread_id IS NULL OR t.type = ${threadTypes.CHAT_SECRET})
  `);
}

export { deleteThread, deleteInaccessibleThreads };
