// @flow

import type { PingRequest, PingResponse } from 'lib/types/ping-types';
import { defaultNumberPerThread } from 'lib/types/message-types';
import type { Viewer } from '../session/viewer';
import {
  serverRequestTypes,
  type ThreadPollPushInconsistencyClientResponse,
} from 'lib/types/request-types';
import { isDeviceType, assertDeviceType } from 'lib/types/device-types';
import { reportTypes } from 'lib/types/report-types';

import t from 'tcomb';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual';

import { ServerError } from 'lib/utils/errors';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils';
import { mostRecentUpdateTimestamp } from 'lib/shared/update-utils';
import { promiseAll } from 'lib/utils/promises';

import {
  validateInput,
  tShape,
  tPlatform,
  tPlatformDetails,
} from '../utils/validation-utils';
import {
  entryQueryInputValidator,
  normalizeCalendarQuery,
  verifyCalendarQueryThreadIDs,
} from './entry-responders';
import { fetchMessageInfosSince } from '../fetchers/message-fetchers';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import {
  updateActivityTime,
  activityUpdater,
} from '../updaters/activity-updaters';
import { fetchCurrentUserInfo } from '../fetchers/user-fetchers';
import { fetchUpdateInfos } from '../fetchers/update-fetchers';
import {
  recordDeliveredUpdate,
  setCookiePlatform,
  setCookiePlatformDetails,
} from '../session/cookies';
import { deviceTokenUpdater } from '../updaters/device-token-updaters';
import createReport from '../creators/report-creator';
import { updateFilterIfChanged } from '../updaters/filter-updaters';
import {
  deleteUpdatesBeforeTimeTargettingCookie,
} from '../deleters/update-deleters';

const pingRequestInputValidator = tShape({
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

  const threadCursors = {};
  for (let watchedThreadID of request.watchedIDs) {
    threadCursors[watchedThreadID] = null;
  }
  const threadSelectionCriteria = { threadCursors, joinedThreads: true };

  let viewerMissingPlatform = !viewer.platform;
  const platformDetails = viewer.platformDetails;
  let viewerMissingPlatformDetails = !platformDetails ||
    (isDeviceType(viewer.platform) &&
      (platformDetails.codeVersion === null ||
        platformDetails.codeVersion === undefined ||
        platformDetails.stateVersion === null ||
        platformDetails.stateVersion === undefined));
  let viewerMissingDeviceToken =
    isDeviceType(viewer.platform) && viewer.loggedIn && !viewer.deviceToken;

  const { clientResponses } = request;
  const clientResponsePromises = [];
  if (clientResponses) {
    const clientSentPlatformDetails = clientResponses.some(
      response => response.type === serverRequestTypes.PLATFORM_DETAILS,
    );
    for (let clientResponse of clientResponses) {
      if (
        clientResponse.type === serverRequestTypes.PLATFORM &&
        !clientSentPlatformDetails
      ) {
        clientResponsePromises.push(setCookiePlatform(
          viewer.cookieID,
          clientResponse.platform,
        ));
        viewerMissingPlatform = false;
        if (!isDeviceType(clientResponse.platform)) {
          viewerMissingPlatformDetails = false;
        }
      } else if (clientResponse.type === serverRequestTypes.DEVICE_TOKEN) {
        clientResponsePromises.push(deviceTokenUpdater(
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
        clientResponsePromises.push(recordThreadPollPushInconsistency(
          viewer,
          clientResponse,
        ));
      } else if (clientResponse.type === serverRequestTypes.PLATFORM_DETAILS) {
        clientResponsePromises.push(setCookiePlatformDetails(
          viewer.cookieID,
          clientResponse.platformDetails,
        ));
        viewerMissingPlatform = false;
        viewerMissingPlatformDetails = false;
      } else if (
        clientResponse.type === serverRequestTypes.INITIAL_ACTIVITY_UPDATE
      ) {
        clientResponsePromises.push(activityUpdater(
          viewer,
          { updates: [ { focus: true, threadID: clientResponse.threadID } ] },
        ));
      }
    }
  }
  if (clientResponsePromises.length > 0) {
    await Promise.all(clientResponsePromises);
  }

  const oldUpdatesCurrentAsOf = request.updatesCurrentAsOf;
  const [
    messagesResult,
    threadsResult,
    entriesResult,
    currentUserInfo,
    currentCalendarQuery,
  ] = await Promise.all([
    fetchMessageInfosSince(
      viewer,
      threadSelectionCriteria,
      clientMessagesCurrentAsOf,
      defaultNumberPerThread,
    ),
    fetchThreadInfos(viewer),
    fetchEntryInfos(viewer, calendarQuery),
    fetchCurrentUserInfo(viewer),
    calendarQuery ? updateFilterIfChanged(viewer, calendarQuery) : undefined,
  ]);

  const promises = {};
  promises.activityUpdate = updateActivityTime(viewer);
  if (oldUpdatesCurrentAsOf !== null && oldUpdatesCurrentAsOf !== undefined) {
    promises.deleteExpiredUpdates = deleteUpdatesBeforeTimeTargettingCookie(
      viewer,
      oldUpdatesCurrentAsOf,
    );
    promises.fetchUpdateResult = fetchUpdateInfos(
      viewer,
      oldUpdatesCurrentAsOf,
      { ...threadsResult, calendarQuery },
    );
    promises.recordDelivery = recordDeliveredUpdate(
      viewer.cookieID,
      oldUpdatesCurrentAsOf,
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

  const userInfos: any = Object.values({
    ...messagesResult.userInfos,
    ...entriesResult.userInfos,
    ...threadsResult.userInfos,
    ...updateUserInfos,
  });

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

  const messagesCurrentAsOf = mostRecentMessageTimestamp(
    messagesResult.rawMessageInfos,
    clientMessagesCurrentAsOf,
  );
  const response: PingResponse = {
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

  return response;
}

async function recordThreadPollPushInconsistency(
  viewer: Viewer,
  response: ThreadPollPushInconsistencyClientResponse,
): Promise<void> {
  const { type, ...rest } = response;
  const reportCreationRequest = {
    ...rest,
    type: reportTypes.THREAD_POLL_PUSH_INCONSISTENCY,
  };
  await createReport(viewer, reportCreationRequest);
}

export {
  pingResponder,
};
