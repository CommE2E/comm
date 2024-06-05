// @flow

import invariant from 'invariant';

import { mostRecentMessageTimestamp } from 'lib/shared/message-utils.js';
import { mostRecentUpdateTimestamp } from 'lib/shared/update-utils.js';
import type { RawEntryInfo } from 'lib/types/entry-types.js';
import { defaultNumberPerThread } from 'lib/types/message-types.js';
import type { SessionState } from 'lib/types/session-types.js';
import {
  type ServerStateSyncSocketPayload,
  type ServerStateSyncFullSocketPayload,
  stateSyncPayloadTypes,
} from 'lib/types/socket-types.js';
import type { LegacyRawThreadInfos } from 'lib/types/thread-types.js';
import type { UserInfo, CurrentUserInfo } from 'lib/types/user-types.js';
import { values } from 'lib/utils/objects.js';
import { promiseAll } from 'lib/utils/promises.js';

import { initializeSession } from './session-utils.js';
import { deleteUpdatesBeforeTimeTargetingSession } from '../deleters/update-deleters.js';
import { fetchMessageInfosSince } from '../fetchers/message-fetchers.js';
import { fetchUpdateInfos } from '../fetchers/update-fetchers.js';
import { verifyCalendarQueryThreadIDs } from '../responders/entry-responders.js';
import { Viewer } from '../session/viewer.js';
import { serverStateSyncSpecs } from '../shared/state-sync/state-sync-specs.js';
import { commitSessionUpdate } from '../updaters/session-updaters.js';

async function fetchDataForSocketInit(
  viewer: Viewer,
  sessionState: SessionState,
): Promise<ServerStateSyncSocketPayload> {
  const {
    calendarQuery,
    updatesCurrentAsOf: oldUpdatesCurrentAsOf,
    messagesCurrentAsOf: oldMessagesCurrentAsOf,
    watchedIDs,
  } = sessionState;
  await verifyCalendarQueryThreadIDs(calendarQuery);

  const sessionInitializationResult = await initializeSession(
    viewer,
    calendarQuery,
    oldUpdatesCurrentAsOf,
  );

  const threadCursors: { [string]: null } = {};
  for (const watchedThreadID of watchedIDs) {
    threadCursors[watchedThreadID] = null;
  }
  const messageSelectionCriteria = {
    threadCursors,
    joinedThreads: true,
    newerThan: oldMessagesCurrentAsOf,
  };
  const fetchMessagesResult = await fetchMessageInfosSince(
    viewer,
    messageSelectionCriteria,
    defaultNumberPerThread,
  );
  const messagesResult = {
    rawMessageInfos: fetchMessagesResult.rawMessageInfos,
    truncationStatuses: fetchMessagesResult.truncationStatuses,
    currentAsOf: mostRecentMessageTimestamp(
      fetchMessagesResult.rawMessageInfos,
      oldMessagesCurrentAsOf,
    ),
  };

  if (!sessionInitializationResult.sessionContinued) {
    const promises: { +[string]: Promise<mixed> } = Object.fromEntries(
      values(serverStateSyncSpecs).map(spec => [
        spec.hashKey,
        spec.fetchFullSocketSyncPayload(viewer, [calendarQuery]),
      ]),
    );
    // We have a type error here because Flow doesn't know spec.hashKey
    const castPromises: {
      +threadInfos: Promise<LegacyRawThreadInfos>,
      +currentUserInfo: Promise<CurrentUserInfo>,
      +entryInfos: Promise<$ReadOnlyArray<RawEntryInfo>>,
      +userInfos: Promise<$ReadOnlyArray<UserInfo>>,
    } = (promises: any);
    const results = await promiseAll(castPromises);
    const payload: ServerStateSyncFullSocketPayload = {
      type: stateSyncPayloadTypes.FULL,
      messagesResult,
      threadInfos: results.threadInfos,
      currentUserInfo: results.currentUserInfo,
      rawEntryInfos: results.entryInfos,
      userInfos: results.userInfos,
      updatesCurrentAsOf: oldUpdatesCurrentAsOf,
    };
    if (viewer.sessionChanged) {
      // If initializeSession encounters sessionIdentifierTypes.BODY_SESSION_ID
      // but the session is unspecified or expired, it will set a new sessionID
      // and specify viewer.sessionChanged
      const { sessionID } = viewer;
      invariant(sessionID !== null && sessionID !== undefined, 'should be set');
      payload.sessionID = sessionID;
      viewer.sessionChanged = false;
    }
    return payload;
  } else {
    const { sessionUpdate, deltaEntryInfoResult } = sessionInitializationResult;

    const deleteExpiredUpdatesPromise = deleteUpdatesBeforeTimeTargetingSession(
      viewer,
      oldUpdatesCurrentAsOf,
    );
    const fetchUpdateResultPromise = fetchUpdateInfos(
      viewer,
      oldUpdatesCurrentAsOf,
      calendarQuery,
    );
    const sessionUpdatePromise = commitSessionUpdate(viewer, sessionUpdate);
    const [fetchUpdateResult] = await Promise.all([
      fetchUpdateResultPromise,
      deleteExpiredUpdatesPromise,
      sessionUpdatePromise,
    ]);

    const { updateInfos, userInfos } = fetchUpdateResult;
    const newUpdatesCurrentAsOf = mostRecentUpdateTimestamp(
      [...updateInfos],
      oldUpdatesCurrentAsOf,
    );
    const updatesResult = {
      newUpdates: updateInfos,
      currentAsOf: newUpdatesCurrentAsOf,
    };
    return {
      type: stateSyncPayloadTypes.INCREMENTAL,
      messagesResult,
      updatesResult,
      deltaEntryInfos: deltaEntryInfoResult.rawEntryInfos,
      deletedEntryIDs: deltaEntryInfoResult.deletedEntryIDs,
      userInfos: values(userInfos),
    };
  }
}

export { fetchDataForSocketInit };
