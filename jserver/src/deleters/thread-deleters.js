// @flow

import type { ThreadDeletionRequest } from 'lib/types/thread-types';
import type { UserViewer } from '../session/viewer';

import bcrypt from 'twin-bcrypt';

import { ServerError } from 'lib/utils/fetch-utils';
import { threadPermissions } from 'lib/types/thread-types';

import { pool, SQL } from '../database';
import { checkThreadPermission } from '../fetchers/thread-fetchers';

async function deleteThread(
  viewer: UserViewer,
  threadDeletionRequest: ThreadDeletionRequest,
) {
  const hasPermission = await checkThreadPermission(
    threadDeletionRequest.threadID,
    threadPermissions.DELETE_THREAD,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const hashQuery = SQL`SELECT hash FROM users WHERE id = ${viewer.userID}`;
  const [ result ] = await pool.query(hashQuery);
  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const row = result[0];
  if (!bcrypt.compareSync(threadDeletionRequest.accountPassword, row.hash)) {
    throw new ServerError('invalid_credentials');
  }

  const query = SQL`
    DELETE t, ic, d, id, e, ie, re, ir, mm, r, ms, im, f, n, ino
    FROM threads t
    LEFT JOIN ids ic ON ic.id = t.id
    LEFT JOIN days d ON d.thread = t.id
    LEFT JOIN ids id ON id.id = d.id
    LEFT JOIN entries e ON e.day = d.id
    LEFT JOIN ids ie ON ie.id = e.id
    LEFT JOIN revisions re ON re.entry = e.id
    LEFT JOIN ids ir ON ir.id = re.id
    LEFT JOIN memberships mm ON mm.thread = t.id
    LEFT JOIN roles r ON r.thread = t.id
    LEFT JOIN messages ms ON ms.thread = t.id
    LEFT JOIN ids im ON im.id = ms.id
    LEFT JOIN focused f ON f.thread = t.id
    LEFT JOIN notifications n ON n.thread = t.id
    LEFT JOIN ids ino ON ino.id = n.id
    WHERE t.id = ${threadDeletionRequest.threadID}
  `;
  await pool.query(query);
}

export {
  deleteThread,
};

