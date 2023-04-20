// @flow

import type {
  DeleteEntryRequest,
  DeleteEntryResponse,
  RestoreEntryRequest,
  RestoreEntryResponse,
} from 'lib/types/entry-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import { threadPermissions } from 'lib/types/thread-types.js';
import { dateString } from 'lib/utils/date-utils.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';

import createIDs from '../creators/id-creator.js';
import createMessages from '../creators/message-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { checkThreadPermissionForEntry } from '../fetchers/entry-fetchers.js';
import { fetchMessageInfoForEntryAction } from '../fetchers/message-fetchers.js';
import { fetchUpdateInfoForEntryUpdate } from '../fetchers/update-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import { createUpdateDatasForChangedEntryInfo } from '../updaters/entry-updaters.js';

const lastRevisionQuery = (entryID: string) => SQL`
    SELECT r.id, r.author, r.text, r.session, r.last_update, r.deleted,
      DAY(d.date) AS day, MONTH(d.date) AS month, YEAR(d.date) AS year,
      d.thread, d.date, e.creation_time, e.creator
    FROM revisions r
    LEFT JOIN entries e ON e.id = r.entry
    LEFT JOIN days d ON d.id = e.day
    WHERE r.entry = ${entryID}
    ORDER BY r.last_update DESC
    LIMIT 1
  `;

async function deleteEntry(
  viewer: Viewer,
  request: DeleteEntryRequest,
): Promise<DeleteEntryResponse> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }
  const [hasPermission, [lastRevisionResult]] = await Promise.all([
    checkThreadPermissionForEntry(
      viewer,
      request.entryID,
      threadPermissions.EDIT_ENTRIES,
    ),
    dbQuery(lastRevisionQuery(request.entryID)),
  ]);
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }
  if (lastRevisionResult.length === 0) {
    throw new ServerError('unknown_error');
  }
  const lastRevisionRow = lastRevisionResult[0];
  const threadID = lastRevisionRow.thread.toString();
  if (lastRevisionRow.deleted) {
    const [rawMessageInfo, fetchUpdatesResult] = await Promise.all([
      fetchMessageInfoForEntryAction(
        viewer,
        messageTypes.DELETE_ENTRY,
        request.entryID,
        threadID,
      ),
      fetchUpdateInfoForEntryUpdate(viewer, request.entryID),
    ]);
    return {
      threadID,
      newMessageInfos: rawMessageInfo ? [rawMessageInfo] : [],
      updatesResult: {
        viewerUpdates: fetchUpdatesResult.updateInfos,
        userInfos: values(fetchUpdatesResult.userInfos),
      },
    };
  }

  const text = lastRevisionRow.text;
  const viewerID = viewer.userID;
  if (viewer.session !== lastRevisionRow.session && request.prevText !== text) {
    throw new ServerError('concurrent_modification', {
      db: text,
      ui: request.prevText,
    });
  } else if (lastRevisionRow.last_update >= request.timestamp) {
    throw new ServerError('old_timestamp', {
      oldTime: lastRevisionRow.last_update,
      newTime: request.timestamp,
    });
  }

  const dbPromises = [];
  dbPromises.push(
    dbQuery(SQL`
    UPDATE entries SET deleted = 1 WHERE id = ${request.entryID}
  `),
  );
  const [revisionID] = await createIDs('revisions', 1);
  const revisionRow = [
    revisionID,
    request.entryID,
    viewerID,
    text,
    request.timestamp,
    viewer.session,
    request.timestamp,
    1,
  ];
  dbPromises.push(
    dbQuery(SQL`
    INSERT INTO revisions(id, entry, author, text, creation_time, session,
      last_update, deleted)
    VALUES ${[revisionRow]}
  `),
  );

  const messageData = {
    type: messageTypes.DELETE_ENTRY,
    threadID,
    creatorID: viewerID,
    time: Date.now(),
    entryID: request.entryID.toString(),
    date: dateString(lastRevisionRow.date),
    text,
  };

  const oldEntryInfo = {
    id: request.entryID,
    threadID,
    text,
    year: lastRevisionRow.year,
    month: lastRevisionRow.month,
    day: lastRevisionRow.day,
    creationTime: lastRevisionRow.creation_time,
    creatorID: lastRevisionRow.creator.toString(),
    deleted: false,
  };
  const newEntryInfo = {
    ...oldEntryInfo,
    deleted: true,
  };

  const [newMessageInfos, updatesResult] = await Promise.all([
    createMessages(viewer, [messageData]),
    createUpdateDatasForChangedEntryInfo(
      viewer,
      oldEntryInfo,
      newEntryInfo,
      request.calendarQuery,
    ),
    Promise.all(dbPromises),
  ]);

  return { threadID, newMessageInfos, updatesResult };
}

async function restoreEntry(
  viewer: Viewer,
  request: RestoreEntryRequest,
): Promise<RestoreEntryResponse> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }
  const [hasPermission, [lastRevisionResult]] = await Promise.all([
    checkThreadPermissionForEntry(
      viewer,
      request.entryID,
      threadPermissions.EDIT_ENTRIES,
    ),
    dbQuery(lastRevisionQuery(request.entryID)),
  ]);
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }
  if (lastRevisionResult.length === 0) {
    throw new ServerError('unknown_error');
  }
  const lastRevisionRow = lastRevisionResult[0];
  const oldEntryInfo = {
    id: request.entryID,
    threadID: lastRevisionRow.thread.toString(),
    text: lastRevisionRow.text,
    year: lastRevisionRow.year,
    month: lastRevisionRow.month,
    day: lastRevisionRow.day,
    creationTime: lastRevisionRow.creation_time,
    creatorID: lastRevisionRow.creator.toString(),
    deleted: !!lastRevisionRow.deleted,
  };

  if (!oldEntryInfo.deleted) {
    const [rawMessageInfo, fetchUpdatesResult] = await Promise.all([
      fetchMessageInfoForEntryAction(
        viewer,
        messageTypes.RESTORE_ENTRY,
        request.entryID,
        oldEntryInfo.threadID,
      ),
      fetchUpdateInfoForEntryUpdate(viewer, request.entryID),
    ]);
    return {
      newMessageInfos: rawMessageInfo ? [rawMessageInfo] : [],
      updatesResult: {
        viewerUpdates: fetchUpdatesResult.updateInfos,
        userInfos: values(fetchUpdatesResult.userInfos),
      },
    };
  }

  const viewerID = viewer.userID;
  const dbPromises = [];
  dbPromises.push(
    dbQuery(SQL`
    UPDATE entries SET deleted = 0 WHERE id = ${request.entryID}
  `),
  );
  const [revisionID] = await createIDs('revisions', 1);
  const revisionRow = [
    revisionID,
    request.entryID,
    viewerID,
    oldEntryInfo.text,
    request.timestamp,
    viewer.session,
    request.timestamp,
    0,
  ];
  dbPromises.push(
    dbQuery(SQL`
    INSERT INTO revisions(id, entry, author, text, creation_time, session,
      last_update, deleted)
    VALUES ${[revisionRow]}
  `),
  );

  const messageData = {
    type: messageTypes.RESTORE_ENTRY,
    threadID: oldEntryInfo.threadID,
    creatorID: viewerID,
    time: Date.now(),
    entryID: request.entryID.toString(),
    date: dateString(lastRevisionRow.date),
    text: oldEntryInfo.text,
  };
  const newEntryInfo = {
    ...oldEntryInfo,
    deleted: false,
  };

  const [newMessageInfos, updatesResult] = await Promise.all([
    createMessages(viewer, [messageData]),
    createUpdateDatasForChangedEntryInfo(
      viewer,
      oldEntryInfo,
      newEntryInfo,
      request.calendarQuery,
    ),
    Promise.all(dbPromises),
  ]);

  return { newMessageInfos, updatesResult };
}

async function deleteOrphanedEntries(): Promise<void> {
  await dbQuery(SQL`
    DELETE e, i
    FROM entries e
    LEFT JOIN ids i ON i.id = e.id
    LEFT JOIN days d ON d.id = e.day
    WHERE d.id IS NULL
  `);
}

export { deleteEntry, restoreEntry, deleteOrphanedEntries };
