// @flow

import type {
  CreateEntryRequest,
  SaveEntryResult,
} from 'lib/types/entry-types';
import type { Viewer } from '../session/viewer';

import { messageType } from 'lib/types/message-types';
import { threadPermissions } from 'lib/types/thread-types';
import { ServerError } from 'lib/utils/fetch-utils';

import { pool, SQL } from '../database';
import fetchOrCreateDayID from '../creators/day-creator';
import createIDs from '../creators/id-creator';
import createMessages from '../creators/message-creator';
import { checkThreadPermission } from '../fetchers/thread-fetchers';

async function createEntry(
  viewer: Viewer,
  request: CreateEntryRequest,
): Promise<SaveEntryResult> {
  const [
    hasPermission,
    dayID,
    [ entryID ],
    [ revisionID ],
  ] = await Promise.all([
    checkThreadPermission(
      viewer,
      request.threadID,
      threadPermissions.EDIT_ENTRIES,
    ),
    fetchOrCreateDayID(
      request.threadID,
      request.date,
    ),
    createIDs("entries", 1),
    createIDs("revisions", 1),
  ]);
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const viewerID = viewer.id;
  const entryRow = [
    entryID,
    dayID,
    request.text,
    viewerID,
    request.timestamp,
    request.timestamp,
    0,
  ];
  const revisionRow = [
    revisionID,
    entryID,
    viewerID,
    request.text,
    request.timestamp,
    request.sessionID,
    request.timestamp,
    0,
  ];
  const entryInsertQuery = SQL`
    INSERT INTO entries(id, day, text, creator, creation_time, last_update,
      deleted)
    VALUES ${[entryRow]}
  `;
  const revisionInsertQuery = SQL`
    INSERT INTO revisions(id, entry, author, text, creation_time, session_id,
      last_update, deleted)
    VALUES ${[revisionRow]}
  `;
  const messageData = {
    type: messageType.CREATE_ENTRY,
    threadID: request.threadID,
    creatorID: viewerID,
    time: Date.now(),
    entryID,
    date: request.date,
    text: request.text,
  };
  const [ newMessageInfos ] = await Promise.all([
    createMessages([messageData]),
    pool.query(entryInsertQuery),
    pool.query(revisionInsertQuery),
  ]);

  return { entryID, newMessageInfos };
}

export default createEntry;
