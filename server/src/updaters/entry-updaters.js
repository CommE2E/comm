// @flow

import type {
  SaveEntryRequest,
  SaveEntryResult,
  RawEntryInfo,
  CalendarQuery,
} from 'lib/types/entry-types';
import type { Viewer } from '../session/viewer';
import { updateTypes, type CreateUpdatesResponse } from 'lib/types/update-types';

import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';
import { threadPermissions } from 'lib/types/thread-types';
import { messageTypes } from 'lib/types/message-types';
import { dateString } from 'lib/utils/date-utils';
import {
  rawEntryInfoWithinCalendarQuery,
  defaultCalendarQuery,
} from 'lib/shared/entry-utils';

import { dbQuery, SQL } from '../database';
import {
  fetchEntryInfo,
  checkThreadPermissionForEntry,
} from '../fetchers/entry-fetchers';
import createIDs from '../creators/id-creator';
import createMessages from '../creators/message-creator';
import {
  fetchCurrentFilter,
  fetchFiltersForThread,
} from '../fetchers/filter-fetchers';
import { createUpdates } from '../creators/update-creator';

const defaultUpdateCreationResponse = { viewerUpdates: [], userInfos: [] };
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
  const dbPromises = [];
  let insertNewRevision = false;
  let updateEntry = false;
  if (
    viewerID === lastRevisionRow.author &&
    request.sessionID === lastRevisionRow.sessionID
  ) {
    if (lastRevisionRow.last_update >= request.timestamp) {
      // Updates got sent out of order and as a result an update newer than us
      // has already been committed, so there's nothing to do
      return {
        entryID: request.entryID,
        newMessageInfos: [],
        updatesResult: defaultUpdateCreationResponse,
      };
    }
    updateEntry = true;
    if (lastRevisionRow.last_update + 120000 > request.timestamp) {
      dbPromises.push(dbQuery(SQL`
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
    dbPromises.push(dbQuery(SQL`
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
    dbPromises.push(dbQuery(SQL`
      INSERT INTO revisions(id, entry, author, text, creation_time,
        session_id, last_update, deleted)
      VALUES ${[revisionRow]}
    `));
  }

  const [ newMessageInfos, updatesResult ] = await Promise.all([
    createMessages([{
      type: messageTypes.EDIT_ENTRY,
      threadID: entryInfo.threadID,
      creatorID: viewerID,
      time: Date.now(),
      entryID: request.entryID,
      date: dateString(entryInfo.year, entryInfo.month, entryInfo.day),
      text: request.text,
    }]),
    createUpdateDatasForChangedEntryInfo(
      viewer,
      entryInfo,
      request.calendarQuery,
    ),
    Promise.all(dbPromises),
  ]);
  return { entryID: request.entryID, newMessageInfos, updatesResult };
}

// The passed-in RawEntryInfo doesn't need to be the version with updated text,
// as the returned UpdateInfos will have newly fetched RawEntryInfos. However,
// the passed-in RawEntryInfo's date is used for determining which clients need
// the update. Right now it's impossible to change an entry's date, but when it
// becomes possible, we will need to update both clients with the old date and
// clients with the new date.
async function createUpdateDatasForChangedEntryInfo(
  viewer: Viewer,
  entryInfo: RawEntryInfo,
  inputCalendarQuery: ?CalendarQuery,
): Promise<CreateUpdatesResponse> {
  const entryID = entryInfo.id;
  invariant(entryID, "should be set");
  const [ fetchedFilters, fetchedCalendarQuery ] = await Promise.all([
    fetchFiltersForThread(entryInfo.threadID),
    inputCalendarQuery ? undefined : fetchCurrentFilter(viewer),
  ]);

  let calendarQuery;
  if (inputCalendarQuery) {
    calendarQuery = inputCalendarQuery;
  } else if (fetchedCalendarQuery) {
    // This should only ever happen for "legacy" clients who call in without
    // providing this information. These clients wouldn't know how to deal with
    // the corresponding UpdateInfos anyways, so no reason to be worried.
    calendarQuery = fetchedCalendarQuery;
  } else {
    calendarQuery = defaultCalendarQuery();
  }

  let replaced = false;
  const filters = fetchedFilters.map(
    filter => filter.session === viewer.session && filter.userID === viewer.id
      ? (replaced = true && { ...filter, calendarQuery })
      : filter,
  );
  if (!replaced) {
    const { id: userID, session } = viewer;
    filters.push({ userID, session, calendarQuery });
  }

  const time = Date.now();
  const updateDatas = filters.filter(
    filter => rawEntryInfoWithinCalendarQuery(entryInfo, filter.calendarQuery),
  ).map(filter => ({
    type: updateTypes.UPDATE_ENTRY,
    userID: filter.userID,
    time,
    entryID,
    targetSession: filter.session,
  }));
  const { userInfos, ...updatesResult } = await createUpdates(
    updateDatas,
    { viewer, calendarQuery },
  );
  return {
    ...updatesResult,
    userInfos: (Object.values(userInfos): any),
  };
}

export {
  updateEntry,
  createUpdateDatasForChangedEntryInfo,
};
