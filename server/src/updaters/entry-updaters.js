// @flow

import type {
  SaveEntryRequest,
  SaveEntryResult,
  RawEntryInfo,
} from 'lib/types/entry-types';
import type { Viewer } from '../session/viewer';
import { updateTypes, type UpdateData } from 'lib/types/update-types';

import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';
import { threadPermissions } from 'lib/types/thread-types';
import { messageTypes } from 'lib/types/message-types';
import { dateString } from 'lib/utils/date-utils';
import { rawEntryInfoWithinCalendarQuery } from 'lib/shared/entry-utils';

import { dbQuery, SQL } from '../database';
import {
  fetchEntryInfo,
  checkThreadPermissionForEntry,
} from '../fetchers/entry-fetchers';
import createIDs from '../creators/id-creator';
import createMessages from '../creators/message-creator';
import { fetchFiltersForThread } from '../fetchers/filter-fetchers';

async function updateEntry(
  viewer: Viewer,
  request: SaveEntryRequest,
): Promise<SaveEntryResult> {
  const lastRevisionQuery = SQL`
    SELECT r.id, r.author, r.text, r.session_id,
      r.last_update, r.deleted, e.text AS entryText
    FROM revisions r
    LEFT JOIN entries e ON r.entry = e.id
    WHERE r.entry = ${request.entryID}
    ORDER BY r.last_update DESC
    LIMIT 1
  `;
  const [
    hasPermission,
    entryInfo,
    [ lastRevisionResult ],
  ] = await Promise.all([
    checkThreadPermissionForEntry(
      viewer,
      request.entryID,
      threadPermissions.EDIT_ENTRIES,
    ),
    fetchEntryInfo(viewer, request.entryID),
    dbQuery(lastRevisionQuery),
  ]);

  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }
  if (!entryInfo) {
    throw new ServerError('invalid_parameters');
  }
  if (entryInfo.deleted) {
    throw new ServerError('entry_deleted');
  }
  if (lastRevisionResult.length === 0) {
    throw new ServerError('unknown_error');
  }
  const lastRevisionRow = lastRevisionResult[0];
  if (
    lastRevisionRow.deleted ||
    lastRevisionRow.text !== lastRevisionRow.entryText
  ) {
    throw new ServerError('database_corruption');
  }

  const viewerID = viewer.id;
  const promises = [];
  let insertNewRevision = false;
  let updateEntry = false;
  if (
    viewerID === lastRevisionRow.author &&
    request.sessionID === lastRevisionRow.sessionID
  ) {
    if (lastRevisionRow.last_update >= request.timestamp) {
      // Updates got sent out of order and as a result an update newer than us
      // has already been committed, so there's nothing to do
      return { entryID: request.entryID, newMessageInfos: [] };
    }
    updateEntry = true;
    if (lastRevisionRow.last_update + 120000 > request.timestamp) {
      promises.push(dbQuery(SQL`
        UPDATE revisions
        SET last_update = ${request.timestamp}, text = ${request.text}
        WHERE id = ${lastRevisionRow.id}
      `));
    } else {
      insertNewRevision = true;
    }
  } else if (
    request.sessionID !== lastRevisionRow.sessionID &&
    request.prevText !== lastRevisionRow.text
  ) {
    throw new ServerError(
      'concurrent_modification',
      { db: lastRevisionRow.text, ui: request.prevText },
    );
  } else if (lastRevisionRow.last_update >= request.timestamp) {
    throw new ServerError(
      'old_timestamp',
      { oldTime: lastRevisionRow.last_update, newTime: request.timestamp },
    );
  } else {
    updateEntry = true;
    insertNewRevision = true;
  }
  if (updateEntry) {
    promises.push(dbQuery(SQL`
      UPDATE entries
      SET last_update = ${request.timestamp}, text = ${request.text}
      WHERE id = ${request.entryID}
    `));
  }
  if (insertNewRevision) {
    const [ revisionID ] = await createIDs("revisions", 1);
    const revisionRow = [
      revisionID,
      request.entryID,
      viewerID,
      request.text,
      request.timestamp,
      request.sessionID,
      request.timestamp,
      0,
    ];
    promises.push(dbQuery(SQL`
      INSERT INTO revisions(id, entry, author, text, creation_time,
        session_id, last_update, deleted)
      VALUES ${[revisionRow]}
    `));
  }
  const messageData = {
    type: messageTypes.EDIT_ENTRY,
    threadID: entryInfo.threadID,
    creatorID: viewerID,
    time: Date.now(),
    entryID: request.entryID,
    date: dateString(entryInfo.year, entryInfo.month, entryInfo.day),
    text: request.text,
  };
  promises.unshift(createMessages([messageData]));

  const [ newMessageInfos ] = await Promise.all(promises);
  return { entryID: request.entryID, newMessageInfos };
}

async function createUpdateDatasForChangedEntryInfo(
  entryInfo: RawEntryInfo,
): Promise<void> {
  const entryID = entryInfo.id;
  invariant(entryID, "should be set");
  const filters = await fetchFiltersForThread(entryInfo.threadID);
  const time = Date.now();
  const updateDatas = filters.filter(
    filter => rawEntryInfoWithinCalendarQuery(entryInfo, filter.calendarQuery),
  ).map(filter => ({
    type: updateTypes.UPDATE_ENTRY,
    userID: filter.userID,
    time,
    entryID,
    targetCookie: filter.cookieID,
  }));
}

export {
  updateEntry,
  createUpdateDatasForChangedEntryInfo,
};
