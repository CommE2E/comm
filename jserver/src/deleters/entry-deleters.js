// @flow

import type { DeleteEntryRequest } from 'lib/types/entry-types';

import { ServerError } from 'lib/utils/fetch-utils';
import { threadPermissions } from 'lib/types/thread-types';

import { pool, SQL } from '../database';
import { currentViewer } from '../session/viewer';
import { checkThreadPermissionForEntry } from '../fetchers/entry-fetchers';
import createIDs from '../creators/id-creator';

async function deleteEntry(request: DeleteEntryRequest) {
  const lastRevisionQuery = SQL`
    SELECT id, author, text, session_id, last_update, deleted
    FROM revisions
    WHERE entry = ${request.entryID}
    ORDER BY last_update DESC
    LIMIT 1
  `;
  const [ hasPermission, [ lastRevisionResult ] ] = await Promise.all([
    checkThreadPermissionForEntry(
      request.entryID,
      threadPermissions.EDIT_ENTRIES,
    ),
    pool.query(lastRevisionQuery),
  ]);
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }
  if (lastRevisionResult.length === 0) {
    throw new ServerError('unknown_error');
  }
  const lastRevisionRow = lastRevisionResult[0];
  if (lastRevisionRow.deleted) {
    throw new ServerError('entry_deleted');
  }

  const text = lastRevisionRow.text;
  const viewerID = currentViewer().id;
  if (
    request.sessionID !== lastRevisionRow.session_id &&
    request.prevText !== text
  ) {
    throw new ServerError(
      'concurrent_modification',
      { db: text, ui: request.prevText },
    );
  } else if (lastRevisionRow.last_update >= request.timestamp) {
    throw new ServerError(
      'old_timestamp',
      { oldTime: lastRevisionRow.last_update, newTime: request.timestamp },
    );
  }

  const [ revisionID ] = await createIDs("revisions", 1);
  const revisionRow = [
    revisionID,
    request.entryID,
    viewerID,
    text,
    request.timestamp,
    request.sessionID,
    request.timestamp,
    1,
  ];
  const revisionInsertQuery = SQL`
    INSERT INTO revisions(id, entry, author, text, creation_time, session_id,
      last_update, deleted)
    VALUES ${[revisionRow]}
  `;
  const entryUpdateQuery = SQL`
    UPDATE entries SET deleted = 1 WHERE id = ${request.entryID}
  `;
  await Promise.all([
    pool.query(revisionInsertQuery),
    pool.query(entryUpdateQuery),
  ]);
}

export {
  deleteEntry,
};
