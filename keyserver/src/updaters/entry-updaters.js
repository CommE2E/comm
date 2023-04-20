// @flow

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';

import {
  rawEntryInfoWithinCalendarQuery,
  calendarQueryDifference,
} from 'lib/shared/entry-utils.js';
import {
  type SaveEntryRequest,
  type SaveEntryResponse,
  type RawEntryInfo,
  type CalendarQuery,
  defaultCalendarQuery,
} from 'lib/types/entry-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import { threadPermissions } from 'lib/types/thread-types.js';
import {
  updateTypes,
  type ServerCreateUpdatesResponse,
} from 'lib/types/update-types.js';
import { dateString } from 'lib/utils/date-utils.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';

import type { SessionUpdate } from './session-updaters.js';
import createIDs from '../creators/id-creator.js';
import createMessages from '../creators/message-creator.js';
import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import {
  fetchEntryInfo,
  checkThreadPermissionForEntry,
} from '../fetchers/entry-fetchers.js';
import { fetchActiveSessionsForThread } from '../fetchers/session-fetchers.js';
import type { Viewer } from '../session/viewer.js';

const defaultUpdateCreationResponse = { viewerUpdates: [], userInfos: [] };
async function updateEntry(
  viewer: Viewer,
  request: SaveEntryRequest,
): Promise<SaveEntryResponse> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const lastRevisionQuery = SQL`
    SELECT r.id, r.author, r.text, r.session,
      r.last_update, r.deleted, e.text AS entryText
    FROM revisions r
    LEFT JOIN entries e ON r.entry = e.id
    WHERE r.entry = ${request.entryID}
    ORDER BY r.last_update DESC
    LIMIT 1
  `;
  const [hasPermission, entryInfo, [lastRevisionResult]] = await Promise.all([
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

  const viewerID = viewer.userID;
  const dbPromises = [];
  let insertNewRevision = false;
  let shouldUpdateEntry = false;
  if (
    viewerID === lastRevisionRow.author &&
    viewer.session === lastRevisionRow.session
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
    shouldUpdateEntry = true;
    if (lastRevisionRow.last_update + 120000 > request.timestamp) {
      dbPromises.push(
        dbQuery(SQL`
        UPDATE revisions
        SET last_update = ${request.timestamp}, text = ${request.text}
        WHERE id = ${lastRevisionRow.id}
      `),
      );
    } else {
      insertNewRevision = true;
    }
  } else if (
    viewer.session !== lastRevisionRow.session &&
    request.prevText !== lastRevisionRow.text
  ) {
    throw new ServerError('concurrent_modification', {
      db: lastRevisionRow.text,
      ui: request.prevText,
    });
  } else if (lastRevisionRow.last_update >= request.timestamp) {
    throw new ServerError('old_timestamp', {
      oldTime: lastRevisionRow.last_update,
      newTime: request.timestamp,
    });
  } else {
    shouldUpdateEntry = true;
    insertNewRevision = true;
  }
  if (shouldUpdateEntry) {
    dbPromises.push(
      dbQuery(SQL`
      UPDATE entries
      SET last_update = ${request.timestamp}, text = ${request.text}
      WHERE id = ${request.entryID}
    `),
    );
  }
  if (insertNewRevision) {
    const [revisionID] = await createIDs('revisions', 1);
    const revisionRow = [
      revisionID,
      request.entryID,
      viewerID,
      request.text,
      request.timestamp,
      viewer.session,
      request.timestamp,
      0,
    ];
    dbPromises.push(
      dbQuery(SQL`
      INSERT INTO revisions(id, entry, author, text, creation_time,
        session, last_update, deleted)
      VALUES ${[revisionRow]}
    `),
    );
  }
  const updatedEntryInfo = {
    ...entryInfo,
    text: request.text,
  };

  const [newMessageInfos, updatesResult] = await Promise.all([
    createMessages(viewer, [
      {
        type: messageTypes.EDIT_ENTRY,
        threadID: entryInfo.threadID,
        creatorID: viewerID,
        time: Date.now(),
        entryID: request.entryID,
        date: dateString(entryInfo.year, entryInfo.month, entryInfo.day),
        text: request.text,
      },
    ]),
    createUpdateDatasForChangedEntryInfo(
      viewer,
      entryInfo,
      updatedEntryInfo,
      request.calendarQuery,
    ),
    Promise.all(dbPromises),
  ]);
  return { entryID: request.entryID, newMessageInfos, updatesResult };
}

async function createUpdateDatasForChangedEntryInfo(
  viewer: Viewer,
  oldEntryInfo: ?RawEntryInfo,
  newEntryInfo: RawEntryInfo,
  inputCalendarQuery: ?CalendarQuery,
): Promise<ServerCreateUpdatesResponse> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }
  const entryID = newEntryInfo.id;
  invariant(entryID, 'should be set');

  // If we ever make it possible to move entries from one thread to another,
  // we should update this code to look at oldEntryInfo.threadID as well
  const fetchedFilters = await fetchActiveSessionsForThread(
    newEntryInfo.threadID,
  );

  let calendarQuery;
  if (inputCalendarQuery) {
    calendarQuery = inputCalendarQuery;
  } else if (viewer.hasSessionInfo) {
    // This should only ever happen for "legacy" clients who call in without
    // providing this information. These clients wouldn't know how to deal with
    // the corresponding UpdateInfos anyways, so no reason to be worried.
    calendarQuery = viewer.calendarQuery;
  } else {
    calendarQuery = defaultCalendarQuery(viewer.platform, viewer.timeZone);
  }

  let replaced = null;
  const { userID } = viewer;
  const filters = fetchedFilters.map(filter =>
    filter.session === viewer.session && filter.userID === userID
      ? (replaced = { ...filter, calendarQuery })
      : filter,
  );
  if (!replaced) {
    const { session } = viewer;
    filters.push({ userID, session, calendarQuery });
  }

  const time = Date.now();
  const updateDatas = filters
    .filter(
      filter =>
        rawEntryInfoWithinCalendarQuery(newEntryInfo, filter.calendarQuery) ||
        (oldEntryInfo &&
          rawEntryInfoWithinCalendarQuery(oldEntryInfo, filter.calendarQuery)),
    )
    .map(filter => ({
      type: updateTypes.UPDATE_ENTRY,
      userID: filter.userID,
      time,
      entryID,
      targetSession: filter.session,
    }));
  const { userInfos, ...updatesResult } = await createUpdates(updateDatas, {
    viewer,
    calendarQuery,
    updatesForCurrentSession: 'return',
  });
  return {
    ...updatesResult,
    userInfos: values(userInfos),
  };
}

type CalendarQueryComparisonResult = {
  +difference: $ReadOnlyArray<CalendarQuery>,
  +oldCalendarQuery: CalendarQuery,
  +sessionUpdate: SessionUpdate,
};
function compareNewCalendarQuery(
  viewer: Viewer,
  newCalendarQuery: CalendarQuery,
): CalendarQueryComparisonResult {
  if (!viewer.hasSessionInfo) {
    throw new ServerError('unknown_error');
  }
  const oldCalendarQuery = viewer.calendarQuery;
  const difference = calendarQueryDifference(
    oldCalendarQuery,
    newCalendarQuery,
  );
  const sessionUpdate = _isEqual(oldCalendarQuery)(newCalendarQuery)
    ? {}
    : { query: newCalendarQuery };
  return {
    difference,
    oldCalendarQuery,
    sessionUpdate: Object.freeze({ ...sessionUpdate }),
  };
}

export {
  updateEntry,
  createUpdateDatasForChangedEntryInfo,
  compareNewCalendarQuery,
};
