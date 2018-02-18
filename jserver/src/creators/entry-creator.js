// @flow

import type { CreateEntryRequest } from 'lib/types/entry-types';

import { messageType } from 'lib/types/message-types';

import { pool, SQL } from '../database';
import fetchOrCreateDayID from '../creators/day-creator';
import createIDs from '../creators/id-creator';
import { currentViewer } from '../session/viewer';
import createMessages from '../creators/message-creator';

async function createEntry(request: CreateEntryRequest) {
  const [ dayID, [ entryID ], [ revisionID ] ] = await Promise.all([
    fetchOrCreateDayID(
      request.threadID,
      request.date,
    ),
    createIDs("entries", 1),
    createIDs("revisions", 1),
  ]);

  const viewerID = currentViewer().id;
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
