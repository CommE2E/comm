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
    fetchServerThreadInfos(SQL`t.id IN (${threadIDs})`),
    rescindPushNotifs(
      SQL`n.thread IN (${threadIDs})`,
      SQL`IF(m.thread IN (${threadIDs}), NULL, m.thread)`,
    ),
  ]);

  const query = SQL`
    DELETE t, ic, d, id, e, ie, re, ire, mm, r, ir, ms, im, up, iu, f, n, ino
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
    LEFT JOIN uploads up ON (up.container = ms.id OR up.container = t.id)
    LEFT JOIN ids iu ON iu.id = up.id
    LEFT JOIN focused f ON f.thread = t.id
    LEFT JOIN notifications n ON n.thread = t.id
    LEFT JOIN ids ino ON ino.id = n.id
    WHERE t.id IN (${threadIDs})
  `;

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
    dbQuery(query),
  ]);

  return { updatesResult: { newUpdates: viewerUpdates } };
}

async function deleteInaccessibleThreads(): Promise<void> {
  // A thread is considered "inaccessible" if it has no membership rows. Note
  // that membership rows exist whenever a user can see a thread, even if they
  // are not technically a member (in which case role=0). For now, we're also
  // excluding threads with children, since to properly delete those we would
  // need to update their parent_thread_id, and possibly change their type.
  await dbQuery(SQL`
    DELETE t, i, m2, d, id, e, ie, re, ire, r, ir, ms, im, up, iu, f, n, ino
    FROM threads t
    LEFT JOIN ids i ON i.id = t.id
    LEFT JOIN memberships m1 ON m1.thread = t.id AND m1.role > -1
    LEFT JOIN threads c ON c.parent_thread_id = t.id
    LEFT JOIN memberships m2 ON m2.thread = t.id
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
    LEFT JOIN uploads up ON (up.container = ms.id OR up.container = t.id)
    LEFT JOIN ids iu ON iu.id = up.id
    LEFT JOIN focused f ON f.thread = t.id
    LEFT JOIN notifications n ON n.thread = t.id
    LEFT JOIN ids ino ON ino.id = n.id
    WHERE m1.thread IS NULL AND c.id IS NULL
  `);
}

export { deleteThread, deleteInaccessibleThreads };
