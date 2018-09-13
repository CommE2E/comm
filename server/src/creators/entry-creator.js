// @flow

import type {
  CreateEntryRequest,
  SaveEntryResult,
} from 'lib/types/entry-types';
import type { Viewer } from '../session/viewer';
import { messageTypes } from 'lib/types/message-types';
import { threadPermissions } from 'lib/types/thread-types';

import { ServerError } from 'lib/utils/errors';
import { dateFromString } from 'lib/utils/date-utils'

import { dbQuery, SQL } from '../database';
import fetchOrCreateDayID from '../creators/day-creator';
import createIDs from '../creators/id-creator';
import createMessages from '../creators/message-creator';
import { checkThreadPermission } from '../fetchers/thread-fetchers';
import {
  createUpdateDatasForChangedEntryInfo
} from '../updaters/entry-updaters';

async function createEntry(
  viewer: Viewer,
  request: CreateEntryRequest,
): Promise<SaveEntryResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }
  const hasPermission = await checkThreadPermission(
    viewer,
    request.threadID,
    threadPermissions.EDIT_ENTRIES,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const [
    dayID,
    [ entryID ],
    [ revisionID ],
  ] = await Promise.all([
    fetchOrCreateDayID(
      request.threadID,
      request.date,
    ),
    createIDs("entries", 1),
    createIDs("revisions", 1),
  ]);

  const viewerID = viewer.userID;
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
    type: messageTypes.CREATE_ENTRY,
    threadID: request.threadID,
    creatorID: viewerID,
    time: Date.now(),
    entryID,
    date: request.date,
    text: request.text,
  };

  const date = dateFromString(request.date);
  const rawEntryInfo = {
    id: entryID,
    threadID: request.threadID,
    text: request.text,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    creationTime: request.timestamp,
    creatorID: viewerID,
    deleted: false,
  };

  const [ newMessageInfos, updatesResult ] = await Promise.all([
    createMessages([messageData]),
    createUpdateDatasForChangedEntryInfo(
      viewer,
      rawEntryInfo,
      request.calendarQuery,
    ),
    dbQuery(entryInsertQuery),
    dbQuery(revisionInsertQuery),
  ]);

  return { entryID, newMessageInfos, updatesResult };
}

export default createEntry;
