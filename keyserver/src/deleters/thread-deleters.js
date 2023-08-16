// @flow

import { permissionLookup } from 'lib/permissions/thread-permissions.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import {
  type ThreadDeletionRequest,
  type LeaveThreadResult,
} from 'lib/types/thread-types.js';
import { updateTypes } from 'lib/types/update-types-enum.js';
import { ServerError } from 'lib/utils/errors.js';

import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import {
  fetchServerThreadInfos,
  fetchContainedThreadIDs,
} from '../fetchers/thread-fetchers.js';
import { fetchThreadPermissionsBlob } from '../fetchers/thread-permission-fetchers.js';
import { fetchUpdateInfoForThreadDeletion } from '../fetchers/update-fetchers.js';
import { rescindPushNotifs } from '../push/rescind.js';
import type { Viewer } from '../session/viewer.js';

async function deleteThread(
  viewer: Viewer,
  threadDeletionRequest: ThreadDeletionRequest,
): Promise<LeaveThreadResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }
  const { threadID } = threadDeletionRequest;

  const permissionsBlob = await fetchThreadPermissionsBlob(viewer, threadID);

  if (!permissionsBlob) {
    // This should only occur if the first request goes through but the client
    // never receives the response
    const { updateInfos } = await fetchUpdateInfoForThreadDeletion(
      viewer,
      threadID,
    );
    return { updatesResult: { newUpdates: updateInfos } };
  }

  const hasPermission = permissionLookup(
    permissionsBlob,
    threadPermissions.DELETE_THREAD,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  // TODO: handle descendant thread permission update correctly.
  //       thread-permission-updaters should be used for descendant threads.
  const threadIDs = await fetchContainedThreadIDs(threadID);

  const [{ threadInfos: serverThreadInfos }] = await Promise.all([
    fetchServerThreadInfos({ threadIDs: new Set(threadIDs) }),
    rescindPushNotifs(
      SQL`n.thread IN (${threadIDs})`,
      SQL`IF(m.thread IN (${threadIDs}), NULL, m.thread)`,
    ),
  ]);

  const time = Date.now();
  const updateDatas = [];
  for (const containedThreadID of threadIDs) {
    for (const memberInfo of serverThreadInfos[containedThreadID].members) {
      updateDatas.push({
        type: updateTypes.DELETE_THREAD,
        userID: memberInfo.id,
        time,
        threadID: containedThreadID,
      });
    }
  }

  const [{ viewerUpdates }] = await Promise.all([
    createUpdates(updateDatas, { viewer, updatesForCurrentSession: 'return' }),
    deleteThreadsFromDB(threadIDs),
  ]);

  return { updatesResult: { newUpdates: viewerUpdates } };
}

function deleteThreadsFromDB(
  threadIDs: $ReadOnlyArray<string>,
): Promise<mixed> {
  const deletionQuery = SQL`
    START TRANSACTION;
    DELETE FROM threads WHERE id IN (${threadIDs});
    DELETE FROM ids WHERE id IN (${threadIDs});
    DELETE d, id, e, ie, r, ir
      FROM days d
      LEFT JOIN ids id ON id.id = d.id
      LEFT JOIN entries e ON e.day = d.id
      LEFT JOIN ids ie ON ie.id = e.id
      LEFT JOIN revisions r ON r.entry = e.id
      LEFT JOIN ids ir ON ir.id = r.id
      WHERE d.thread IN (${threadIDs});
    DELETE FROM memberships WHERE thread IN (${threadIDs});
    DELETE r, i
      FROM roles r
      LEFT JOIN ids i ON i.id = r.id
      WHERE r.thread IN (${threadIDs});
    DELETE m, im, u, iu
      FROM messages m
      LEFT JOIN ids im ON im.id = m.id
      LEFT JOIN uploads u ON u.container = m.id
      LEFT JOIN ids iu ON iu.id = u.id
      WHERE m.thread IN (${threadIDs});
    DELETE FROM uploads WHERE container IN (${threadIDs});
    DELETE FROM focused WHERE thread IN (${threadIDs});
    DELETE n, i
      FROM notifications n
      LEFT JOIN ids i ON i.id = n.id
      WHERE n.thread IN (${threadIDs});
    COMMIT;
  `;
  return dbQuery(deletionQuery, { multipleStatements: true });
}

async function deleteInaccessibleThreads(): Promise<void> {
  // A thread is considered "inaccessible" if it has no membership rows. Note
  // that membership rows exist whenever a user can see a thread, even if they
  // are not technically a member (in which case role=0). For now, we're also
  // excluding threads with children, since to properly delete those we would
  // need to update their parent_thread_id, and possibly change their type.
  const [fetchResult] = await dbQuery(SQL`
    SELECT t.id
    FROM threads t
    LEFT JOIN memberships m ON m.thread = t.id AND m.role > -1
    LEFT JOIN threads c ON c.parent_thread_id = t.id
    WHERE m.thread IS NULL AND c.id IS NULL
  `);
  const threadIDs = new Set(fetchResult.map(({ id }) => id));
  if (threadIDs.size === 0) {
    return;
  }
  await deleteThreadsFromDB([...threadIDs]);
}

export { deleteThread, deleteInaccessibleThreads };
