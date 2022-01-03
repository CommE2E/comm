// @flow

import invariant from 'invariant';

import type {
  CreateEntryRequest,
  SaveEntryResponse,
} from 'lib/types/entry-types';
import { messageTypes } from 'lib/types/message-types-enum';
import { threadPermissions } from 'lib/types/thread-types';
import { dateFromString } from 'lib/utils/date-utils';
import { ServerError } from 'lib/utils/errors';
import { values } from 'lib/utils/objects';

import fetchOrCreateDayID from '../creators/day-creator';
import createIDs from '../creators/id-creator';
import createMessages from '../creators/message-creator';
import { dbQuery, SQL } from '../database/database';
import { fetchEntryInfoForLocalID } from '../fetchers/entry-fetchers';
import { fetchMessageInfoForEntryAction } from '../fetchers/message-fetchers';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers';
import { fetchUpdateInfoForEntryUpdate } from '../fetchers/update-fetchers';
import type { Viewer } from '../session/viewer';
import { createUpdateDatasForChangedEntryInfo } from '../updaters/entry-updaters';
import { creationString } from '../utils/idempotent';

async function createEntry(
  viewer: Viewer,
  request: CreateEntryRequest,
): Promise<SaveEntryResponse> {
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

  const existingEntryInfo = await fetchEntryInfoForLocalID(
    viewer,
    request.localID,
  );
  if (existingEntryInfo) {
    const { id: entryID, threadID } = existingEntryInfo;
    invariant(entryID, 'should be set');
    const [rawMessageInfo, fetchUpdatesResult] = await Promise.all([
      fetchMessageInfoForEntryAction(
        viewer,
        messageTypes.CREATE_ENTRY,
        entryID,
        threadID,
      ),
      fetchUpdateInfoForEntryUpdate(viewer, entryID),
    ]);
    return {
      entryID,
      newMessageInfos: rawMessageInfo ? [rawMessageInfo] : [],
      updatesResult: {
        viewerUpdates: fetchUpdatesResult.updateInfos,
        userInfos: values(fetchUpdatesResult.userInfos),
      },
    };
  }

  const [dayID, [entryID], [revisionID]] = await Promise.all([
    fetchOrCreateDayID(request.threadID, request.date),
    createIDs('entries', 1),
    createIDs('revisions', 1),
  ]);

  const creation =
    request.localID && viewer.hasSessionInfo
      ? creationString(viewer, request.localID)
      : null;
  const viewerID = viewer.userID;
  const entryRow = [
    entryID,
    dayID,
    request.text,
    viewerID,
    request.timestamp,
    request.timestamp,
    0,
    creation,
  ];
  const revisionRow = [
    revisionID,
    entryID,
    viewerID,
    request.text,
    request.timestamp,
    viewer.session,
    request.timestamp,
    0,
  ];
  const entryInsertQuery = SQL`
    INSERT INTO entries(id, day, text, creator, creation_time, last_update,
      deleted, creation)
    VALUES ${[entryRow]}
  `;
  const revisionInsertQuery = SQL`
    INSERT INTO revisions(id, entry, author, text, creation_time, session,
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

  const [newMessageInfos, updatesResult] = await Promise.all([
    createMessages(viewer, [messageData]),
    createUpdateDatasForChangedEntryInfo(
      viewer,
      null,
      rawEntryInfo,
      request.calendarQuery,
    ),
    dbQuery(entryInsertQuery),
    dbQuery(revisionInsertQuery),
  ]);

  return { entryID, newMessageInfos, updatesResult };
}

export default createEntry;
