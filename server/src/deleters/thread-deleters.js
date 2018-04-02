// @flow

import type {
  ThreadDeletionRequest,
  LeaveThreadResult,
} from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';

import bcrypt from 'twin-bcrypt';

import { ServerError } from 'lib/utils/errors';
import { threadPermissions } from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database';
import {
  checkThreadPermission,
  fetchThreadInfos,
} from '../fetchers/thread-fetchers';

async function deleteThread(
  viewer: Viewer,
  threadDeletionRequest: ThreadDeletionRequest,
): Promise<LeaveThreadResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const hasPermission = await checkThreadPermission(
    viewer,
    threadDeletionRequest.threadID,
    threadPermissions.DELETE_THREAD,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const hashQuery = SQL`SELECT hash FROM users WHERE id = ${viewer.userID}`;
  const [ result ] = await dbQuery(hashQuery);
  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const row = result[0];
  if (!bcrypt.compareSync(threadDeletionRequest.accountPassword, row.hash)) {
    throw new ServerError('invalid_credentials');
  }

  // TODO delete all descendant threads as well
  const query = SQL`
    DELETE t, ic, d, id, e, ie, re, ire, mm, r, ms, im, f, n, ino
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
    LEFT JOIN ids ir ON r.thread = t.id
    LEFT JOIN messages ms ON ms.thread = t.id
    LEFT JOIN ids im ON im.id = ms.id
    LEFT JOIN focused f ON f.thread = t.id
    LEFT JOIN notifications n ON n.thread = t.id
    LEFT JOIN ids ino ON ino.id = n.id
    WHERE t.id = ${threadDeletionRequest.threadID}
  `;
  await dbQuery(query);

  const { threadInfos } = await fetchThreadInfos(viewer);
  return { threadInfos };
}

async function deleteInaccessibleThreads(): Promise<void> {
  await dbQuery(SQL`
    DELETE t, i, d, id, e, ie, re, ire, r, ir, ms, im, f, n, ino
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
    LEFT JOIN ids ir ON r.thread = t.id
    LEFT JOIN messages ms ON ms.thread = t.id
    LEFT JOIN ids im ON im.id = ms.id
    LEFT JOIN focused f ON f.thread = t.id
    LEFT JOIN notifications n ON n.thread = t.id
    LEFT JOIN ids ino ON ino.id = n.id
    WHERE m.thread IS NULL
  `);
}

export {
  deleteThread,
  deleteInaccessibleThreads,
};
