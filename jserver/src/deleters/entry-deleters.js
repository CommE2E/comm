// @flow

import type {
  DeleteEntryRequest,
  DeleteEntryResponse,
  RestoreEntryRequest,
  RestoreEntryResponse,
} from 'lib/types/entry-types';

import { ServerError } from 'lib/utils/fetch-utils';
import { threadPermissions } from 'lib/types/thread-types';
import { dateString } from 'lib/utils/date-utils';
import { messageType } from 'lib/types/message-types';

import { pool, SQL } from '../database';
import { currentViewer } from '../session/viewer';
import { checkThreadPermissionForEntry } from '../fetchers/entry-fetchers';
import createIDs from '../creators/id-creator';
import createMessages from '../creators/message-creator';

const lastRevisionQuery = (entryID: string) =>
  (SQL`
    SELECT r.id, r.author, r.text, r.session_id, r.last_update, r.deleted,
      DAY(d.date) AS day, MONTH(d.date) AS month, YEAR(d.date) AS year,
      d.thread, d.date, e.creation_time, e.creator
    FROM revisions r
    LEFT JOIN entries e ON e.id = r.entry
    LEFT JOIN days d ON d.id = e.day
    WHERE r.entry = ${entryID}
    ORDER BY r.last_update DESC
    LIMIT 1
  `);

async function deleteEntry(
  request: DeleteEntryRequest,
): Promise<DeleteEntryResponse> {
  const [ hasPermission, [ lastRevisionResult ] ] = await Promise.all([
    checkThreadPermissionForEntry(
      request.entryID,
      threadPermissions.EDIT_ENTRIES,
    ),
    pool.query(lastRevisionQuery(request.entryID)),
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

  const promises = [];
  promises.push(pool.query(SQL`
    UPDATE entries SET deleted = 1 WHERE id = ${request.entryID}
  `));
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
  promises.push(pool.query(SQL`
    INSERT INTO revisions(id, entry, author, text, creation_time, session_id,
      last_update, deleted)
    VALUES ${[revisionRow]}
  `));
  const threadID = lastRevisionRow.thread.toString();
  const messageData = {
    type: messageType.DELETE_ENTRY,
    threadID: threadID,
    creatorID: viewerID,
    time: Date.now(),
    entryID: request.entryID.toString(),
    date: dateString(lastRevisionRow.date),
    text,
  };
  promises.unshift(createMessages([messageData]));

  const [ newMessageInfos ] = await Promise.all(promises);
  return { threadID, newMessageInfos };
}

async function restoreEntry(
  request: RestoreEntryRequest,
): Promise<RestoreEntryResponse> {
  const [ hasPermission, [ lastRevisionResult ] ] = await Promise.all([
    checkThreadPermissionForEntry(
      request.entryID,
      threadPermissions.EDIT_ENTRIES,
    ),
    pool.query(lastRevisionQuery(request.entryID)),
  ]);
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }
  if (lastRevisionResult.length === 0) {
    throw new ServerError('unknown_error');
  }
  const lastRevisionRow = lastRevisionResult[0];
  if (!lastRevisionRow.deleted) {
    throw new ServerError('entry_not_deleted');
  }

  const text = lastRevisionRow.text;
  const viewerID = currentViewer().id;
  const promises = [];
  promises.push(pool.query(SQL`
    UPDATE entries SET deleted = 0 WHERE id = ${request.entryID}
  `));
  const [ revisionID ] = await createIDs("revisions", 1);
  const revisionRow = [
    revisionID,
    request.entryID,
    viewerID,
    text,
    request.timestamp,
    request.sessionID,
    request.timestamp,
    0,
  ];
  promises.push(pool.query(SQL`
    INSERT INTO revisions(id, entry, author, text, creation_time, session_id,
      last_update, deleted)
    VALUES ${[revisionRow]}
  `));
  const threadID = lastRevisionRow.thread.toString();
  const messageData = {
    type: messageType.RESTORE_ENTRY,
    threadID,
    creatorID: viewerID,
    time: Date.now(),
    entryID: request.entryID.toString(),
    date: dateString(lastRevisionRow.date),
    text,
  };
  promises.unshift(createMessages([messageData]));

  const [ newMessageInfos ] = await Promise.all(promises);
  const entryInfo = {
    id: request.entryID,
    threadID,
    text,
    year: lastRevisionRow.year,
    month: lastRevisionRow.month,
    day: lastRevisionRow.day,
    creationTime: lastRevisionRow.creation_time,
    creatorID: lastRevisionRow.creator.toString(),
    deleted: false,
  }

  return { entryInfo, newMessageInfos };
}

export {
  deleteEntry,
  restoreEntry,
};
