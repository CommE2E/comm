// @flow

import {
  type PingRequest,
  type PingResponse,
  pingResponseTypes,
} from 'lib/types/ping-types';
import { defaultNumberPerThread } from 'lib/types/message-types';
import type { Viewer } from '../session/viewer';
import {
  serverRequestTypes,
  type ThreadPollPushInconsistencyClientResponse,
  type EntryPollPushInconsistencyClientResponse,
  type ClientResponse,
  type ServerRequest,
} from 'lib/types/request-types';
import { isDeviceType, assertDeviceType } from 'lib/types/device-types';
import {
  reportTypes,
  type ThreadPollPushInconsistencyReportCreationRequest,
  type EntryPollPushInconsistencyReportCreationRequest,
} from 'lib/types/report-types';
import type {
  CalendarQuery,
  FetchEntryInfosResponse,
} from 'lib/types/entry-types';

import t from 'tcomb';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual';

import { ServerError } from 'lib/utils/errors';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils';
import { mostRecentUpdateTimestamp } from 'lib/shared/update-utils';
import { promiseAll } from 'lib/utils/promises';
import { values } from 'lib/utils/objects';

import {
  validateInput,
  tShape,
  tPlatform,
  tPlatformDetails,
} from '../utils/validation-utils';
import {
  entryQueryInputValidator,
  newEntryQueryInputValidator,
  normalizeCalendarQuery,
  verifyCalendarQueryThreadIDs,
} from './entry-responders';
import { fetchMessageInfosSince } from '../fetchers/message-fetchers';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import {
  fetchEntryInfos,
  fetchEntriesForSession,
} from '../fetchers/entry-fetchers';
import {
  updateActivityTime,
  activityUpdater,
} from '../updaters/activity-updaters';
import { fetchCurrentUserInfo } from '../fetchers/user-fetchers';
import { fetchUpdateInfos } from '../fetchers/update-fetchers';
import {
  setNewSession,
  setCookiePlatform,
  setCookiePlatformDetails,
} from '../session/cookies';
import { deviceTokenUpdater } from '../updaters/device-token-updaters';
import createReport from '../creators/report-creator';
import {
  compareNewCalendarQuery,
  commitSessionUpdate,
} from '../updaters/session-updaters';
import {
  deleteUpdatesBeforeTimeTargettingSession,
} from '../deleters/update-deleters';

const pingRequestInputValidator = tShape({
  type: t.maybe(t.Number),
  calendarQuery: entryQueryInputValidator,
  lastPing: t.maybe(t.Number), // deprecated
  messagesCurrentAsOf: t.maybe(t.Number),
  updatesCurrentAsOf: t.maybe(t.Number),
  watchedIDs: t.list(t.String),
  clientResponses: t.maybe(t.list(t.union([
    tShape({
      type: t.irreducible(
        'serverRequestTypes.PLATFORM',
        x => x === serverRequestTypes.PLATFORM,
      ),
      platform: tPlatform,
    }),
    tShape({
      type: t.irreducible(
        'serverRequestTypes.DEVICE_TOKEN',
        x => x === serverRequestTypes.DEVICE_TOKEN,
      ),
      deviceToken: t.String,
    }),
    tShape({
      type: t.irreducible(
        'serverRequestTypes.THREAD_POLL_PUSH_INCONSISTENCY',
        x => x === serverRequestTypes.THREAD_POLL_PUSH_INCONSISTENCY,
      ),
      platformDetails: tPlatformDetails,
      beforeAction: t.Object,
      action: t.Object,
      pollResult: t.Object,
      pushResult: t.Object,
      lastActionTypes: t.maybe(t.list(t.String)),
      time: t.maybe(t.Number),
    }),
    tShape({
      type: t.irreducible(
        'serverRequestTypes.ENTRY_POLL_PUSH_INCONSISTENCY',
        x => x === serverRequestTypes.ENTRY_POLL_PUSH_INCONSISTENCY,
      ),
      platformDetails: tPlatformDetails,
      beforeAction: t.Object,
      action: t.Object,
      calendarQuery: newEntryQueryInputValidator,
      pollResult: t.Object,
      pushResult: t.Object,
      lastActionTypes: t.list(t.String),
      time: t.Number,
    }),
    tShape({
      type: t.irreducible(
        'serverRequestTypes.PLATFORM_DETAILS',
        x => x === serverRequestTypes.PLATFORM_DETAILS,
      ),
      platformDetails: tPlatformDetails,
    }),
    tShape({
      type: t.irreducible(
        'serverRequestTypes.INITIAL_ACTIVITY_UPDATE',
        x => x === serverRequestTypes.INITIAL_ACTIVITY_UPDATE,
      ),
      threadID: t.String,
    }),
  ]))),
});

async function pingResponder(
  viewer: Viewer,
  input: any,
): Promise<PingResponse> {
  const request: PingRequest = input;
  request.calendarQuery = normalizeCalendarQuery(request.calendarQuery);
  validateInput(pingRequestInputValidator, request);

  let clientMessagesCurrentAsOf;
  if (
    request.messagesCurrentAsOf !== null &&
    request.messagesCurrentAsOf !== undefined
  ) {
    clientMessagesCurrentAsOf = request.messagesCurrentAsOf;
  } else if (request.lastPing !== null && request.lastPing !== undefined) {
    clientMessagesCurrentAsOf = request.lastPing;
  }
  if (
    clientMessagesCurrentAsOf === null ||
    clientMessagesCurrentAsOf === undefined
  ) {
    throw new ServerError('invalid_parameters');
  }
  const { calendarQuery } = request;
  await verifyCalendarQueryThreadIDs(calendarQuery);

  const oldUpdatesCurrentAsOf = request.updatesCurrentAsOf;
  const threadCursors = {};
  for (let watchedThreadID of request.watchedIDs) {
    threadCursors[watchedThreadID] = null;
  }
  const threadSelectionCriteria = { threadCursors, joinedThreads: true };
  const [
    sessionInitializationResult,
    messagesResult,
    serverRequests,
  ] = await Promise.all([
    initializeSession(viewer, calendarQuery, oldUpdatesCurrentAsOf),
    fetchMessageInfosSince(
      viewer,
      threadSelectionCriteria,
      clientMessagesCurrentAsOf,
      defaultNumberPerThread,
    ),
    processClientResponses(
      viewer,
      request.clientResponses,
    ),
  ]);
  const incrementalUpdate = request.type === pingResponseTypes.INCREMENTAL
    && sessionInitializationResult.sessionContinued;
  const messagesCurrentAsOf = mostRecentMessageTimestamp(
    messagesResult.rawMessageInfos,
    clientMessagesCurrentAsOf,
  );

  const promises = {};
  promises.activityUpdate = updateActivityTime(viewer);
  if (
    viewer.loggedIn &&
    oldUpdatesCurrentAsOf !== null &&
    oldUpdatesCurrentAsOf !== undefined
  ) {
    promises.deleteExpiredUpdates = deleteUpdatesBeforeTimeTargettingSession(
      viewer,
      oldUpdatesCurrentAsOf,
    );
    promises.fetchUpdateResult = fetchUpdateInfos(
      viewer,
      oldUpdatesCurrentAsOf,
      calendarQuery,
    );
  }
  const { fetchUpdateResult } = await promiseAll(promises);

  let updateUserInfos = {}, updatesResult = null;
  if (fetchUpdateResult) {
    invariant(
      oldUpdatesCurrentAsOf !== null && oldUpdatesCurrentAsOf !== undefined,
      "should be set",
    );
    updateUserInfos = fetchUpdateResult.userInfos;
    const { updateInfos } = fetchUpdateResult;
    const newUpdatesCurrentAsOf = mostRecentUpdateTimestamp(
      [...updateInfos],
      oldUpdatesCurrentAsOf,
    );
    updatesResult = {
      newUpdates: updateInfos,
      currentAsOf: newUpdatesCurrentAsOf,
    };
  }

  if (incrementalUpdate) {
    invariant(sessionInitializationResult.sessionContinued, "should be set");
    const userInfos = values({
      ...messagesResult.userInfos,
      ...updateUserInfos,
      ...sessionInitializationResult.deltaEntryInfoResult.userInfos,
    });
    const response: PingResponse = {
      type: pingResponseTypes.INCREMENTAL,
      messagesResult: {
        rawMessageInfos: messagesResult.rawMessageInfos,
        truncationStatuses: messagesResult.truncationStatuses,
        currentAsOf: messagesCurrentAsOf,
      },
      deltaEntryInfos:
        sessionInitializationResult.deltaEntryInfoResult.rawEntryInfos,
      userInfos,
      serverRequests,
    };
    if (updatesResult) {
      response.updatesResult = updatesResult;
    }
    return response;
  }

  const [
    threadsResult,
    entriesResult,
    currentUserInfo,
  ] = await Promise.all([
    fetchThreadInfos(viewer),
    fetchEntryInfos(viewer, [ calendarQuery ]),
    fetchCurrentUserInfo(viewer),
  ]);

  const deltaEntriesUserInfos = sessionInitializationResult.sessionContinued
    ? sessionInitializationResult.deltaEntryInfoResult.userInfos
    : undefined;
  const userInfos = values({
    ...messagesResult.userInfos,
    ...entriesResult.userInfos,
    ...threadsResult.userInfos,
    ...updateUserInfos,
    ...deltaEntriesUserInfos,
  });

  const response: PingResponse = {
    type: pingResponseTypes.FULL,
    threadInfos: threadsResult.threadInfos,
    currentUserInfo,
    rawMessageInfos: messagesResult.rawMessageInfos,
    truncationStatuses: messagesResult.truncationStatuses,
    messagesCurrentAsOf,
    serverTime: messagesCurrentAsOf,
    rawEntryInfos: entriesResult.rawEntryInfos,
    userInfos,
    serverRequests,
  };
  if (updatesResult) {
    response.updatesResult = updatesResult;
  }
  if (sessionInitializationResult.sessionContinued) {
    response.deltaEntryInfos =
      sessionInitializationResult.deltaEntryInfoResult.rawEntryInfos;
  }

  return response;
}

async function processClientResponses(
  viewer: Viewer,
  clientResponses: ?$ReadOnlyArray<ClientResponse>,
): Promise<ServerRequest[]> {
  let viewerMissingPlatform = !viewer.platform;
  const { platformDetails } = viewer;
  let viewerMissingPlatformDetails = !platformDetails ||
    (isDeviceType(viewer.platform) &&
      (platformDetails.codeVersion === null ||
        platformDetails.codeVersion === undefined ||
        platformDetails.stateVersion === null ||
        platformDetails.stateVersion === undefined));
  let viewerMissingDeviceToken =
    isDeviceType(viewer.platform) && viewer.loggedIn && !viewer.deviceToken;

  const promises = [];
  if (clientResponses) {
    const clientSentPlatformDetails = clientResponses.some(
      response => response.type === serverRequestTypes.PLATFORM_DETAILS,
    );
    for (let clientResponse of clientResponses) {
      if (
        clientResponse.type === serverRequestTypes.PLATFORM &&
        !clientSentPlatformDetails
      ) {
        promises.push(setCookiePlatform(
          viewer.cookieID,
          clientResponse.platform,
        ));
        viewerMissingPlatform = false;
        if (!isDeviceType(clientResponse.platform)) {
          viewerMissingPlatformDetails = false;
        }
      } else if (clientResponse.type === serverRequestTypes.DEVICE_TOKEN) {
        promises.push(deviceTokenUpdater(
          viewer,
          {
            deviceToken: clientResponse.deviceToken,
            deviceType: assertDeviceType(viewer.platform),
          },
        ));
        viewerMissingDeviceToken = false;
      } else if (
        clientResponse.type ===
          serverRequestTypes.THREAD_POLL_PUSH_INCONSISTENCY
      ) {
        promises.push(recordThreadPollPushInconsistency(
          viewer,
          clientResponse,
        ));
      } else if (
        clientResponse.type === serverRequestTypes.ENTRY_POLL_PUSH_INCONSISTENCY
      ) {
        promises.push(recordEntryPollPushInconsistency(
          viewer,
          clientResponse,
        ));
      } else if (clientResponse.type === serverRequestTypes.PLATFORM_DETAILS) {
        promises.push(setCookiePlatformDetails(
          viewer.cookieID,
          clientResponse.platformDetails,
        ));
        viewerMissingPlatform = false;
        viewerMissingPlatformDetails = false;
      } else if (
        clientResponse.type === serverRequestTypes.INITIAL_ACTIVITY_UPDATE
      ) {
        promises.push(activityUpdater(
          viewer,
          { updates: [ { focus: true, threadID: clientResponse.threadID } ] },
        ));
      }
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  const serverRequests = [];
  if (viewerMissingPlatform) {
    serverRequests.push({ type: serverRequestTypes.PLATFORM });
  }
  if (viewerMissingPlatformDetails) {
    serverRequests.push({ type: serverRequestTypes.PLATFORM_DETAILS });
  }
  if (viewerMissingDeviceToken) {
    serverRequests.push({ type: serverRequestTypes.DEVICE_TOKEN });
  }
  return serverRequests;
}

async function recordThreadPollPushInconsistency(
  viewer: Viewer,
  response: ThreadPollPushInconsistencyClientResponse,
): Promise<void> {
  const { type, ...rest } = response;
  const reportCreationRequest = ({
    ...rest,
    type: reportTypes.THREAD_POLL_PUSH_INCONSISTENCY,
  }: ThreadPollPushInconsistencyReportCreationRequest);
  await createReport(viewer, reportCreationRequest);
}

async function recordEntryPollPushInconsistency(
  viewer: Viewer,
  response: EntryPollPushInconsistencyClientResponse,
): Promise<void> {
  const { type, ...rest } = response;
  const reportCreationRequest = ({
    ...rest,
    type: reportTypes.ENTRY_POLL_PUSH_INCONSISTENCY,
  }: EntryPollPushInconsistencyReportCreationRequest);
  await createReport(viewer, reportCreationRequest);
}

type SessionInitializationResult =
  | {| sessionContinued: false |}
  | {|
      sessionContinued: true,
      deltaEntryInfoResult: FetchEntryInfosResponse,
    |};
async function initializeSession(
  viewer: Viewer,
  calendarQuery: CalendarQuery,
  oldLastUpdate: ?number,
): Promise<SessionInitializationResult> {
  if (!viewer.loggedIn) {
    return { sessionContinued: false };
  }

  let comparisonResult = null;
  try {
    comparisonResult = await compareNewCalendarQuery(viewer, calendarQuery);
  } catch (e) {
    if (e.message !== "unknown_error") {
      throw e;
    }
  }

  if (comparisonResult) {
    const { difference, sessionUpdate, oldCalendarQuery } = comparisonResult;
    if (oldLastUpdate !== null && oldLastUpdate !== undefined) {
      sessionUpdate.lastUpdate = oldLastUpdate;
    }
    const [ deltaEntryInfoResult ] = await Promise.all([
      fetchEntriesForSession(viewer, difference, oldCalendarQuery),
      commitSessionUpdate(viewer, sessionUpdate),
    ]);
    return { sessionContinued: true, deltaEntryInfoResult };
  } else if (oldLastUpdate !== null && oldLastUpdate !== undefined) {
    await setNewSession(viewer, calendarQuery, oldLastUpdate);
    return { sessionContinued: false };
  } else {
    // We're only able to create the session if we have oldLastUpdate. At this
    // time the only code in pingResponder that uses viewer.session should be
    // gated on oldLastUpdate anyways, so we should be okay just returning.
    return { sessionContinued: false };
  }
}

export {
  pingResponder,
};
