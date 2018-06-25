// @flow

import type { PingRequest, PingResponse } from 'lib/types/ping-types';
import { defaultNumberPerThread } from 'lib/types/message-types';
import type { Viewer } from '../session/viewer';
import { serverRequestTypes } from 'lib/types/request-types';
import { isDeviceType, assertDeviceType } from 'lib/types/device-types';

import t from 'tcomb';
import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils';
import { mostRecentUpdateTimestamp } from 'lib/shared/update-utils';

import { validateInput, tShape, tPlatform } from '../utils/validation-utils';
import {
  entryQueryInputValidator,
  normalizeCalendarQuery,
  verifyCalendarQueryThreadIDs,
} from './entry-responders';
import { fetchMessageInfosSince } from '../fetchers/message-fetchers';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { updateActivityTime } from '../updaters/activity-updaters';
import { fetchCurrentUserInfo } from '../fetchers/user-fetchers';
import { fetchUpdateInfos } from '../fetchers/update-fetchers';
import { recordDeliveredUpdate, setCookiePlatform } from '../session/cookies';
import { deviceTokenUpdater } from '../updaters/device-token-updaters';

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

  await verifyCalendarQueryThreadIDs(request.calendarQuery);

  const threadCursors = {};
  for (let watchedThreadID of request.watchedIDs) {
    threadCursors[watchedThreadID] = null;
  }
  const threadSelectionCriteria = { threadCursors, joinedThreads: true };

  const clientResponsePromises = [];
  let viewerMissingPlatform = !viewer.platform;
  let viewerMissingDeviceToken =
    isDeviceType(viewer.platform) && viewer.loggedIn && !viewer.deviceToken;
  if (request.clientResponses) {
    for (let clientResponse of request.clientResponses) {
      if (clientResponse.type === serverRequestTypes.PLATFORM) {
        clientResponsePromises.push(setCookiePlatform(
          viewer.cookieID,
          clientResponse.platform,
        ));
        viewerMissingPlatform = false;
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
        // TODO record here
      }
    }
  }

  const oldUpdatesCurrentAsOf = request.updatesCurrentAsOf;
  const [
    messagesResult,
    threadsResult,
    entriesResult,
    currentUserInfo,
  ] = await Promise.all([
    fetchMessageInfosSince(
      viewer,
      threadSelectionCriteria,
      clientMessagesCurrentAsOf,
      defaultNumberPerThread,
    ),
    fetchThreadInfos(viewer),
    fetchEntryInfos(viewer, request.calendarQuery),
    fetchCurrentUserInfo(viewer),
    clientResponsePromises.length > 0
      ? Promise.all(clientResponsePromises)
      : null,
  ]);

  let updatesResult = null;
  if (oldUpdatesCurrentAsOf !== null && oldUpdatesCurrentAsOf !== undefined) {
    const { updateInfos } = await fetchUpdateInfos(
      viewer,
      oldUpdatesCurrentAsOf,
      { ...threadsResult, calendarQuery: request.calendarQuery },
    );
    const newUpdatesCurrentAsOf = mostRecentUpdateTimestamp(
      [...updateInfos],
      oldUpdatesCurrentAsOf,
    );
    updatesResult = {
      newUpdates: updateInfos,
      currentAsOf: newUpdatesCurrentAsOf,
    };
  }

  const timestampUpdatePromises = [ updateActivityTime(viewer) ];
  if (updatesResult && updatesResult.newUpdates.length > 0) {
    timestampUpdatePromises.push(
      recordDeliveredUpdate(viewer.cookieID, updatesResult.currentAsOf),
    );
  }
  await Promise.all(timestampUpdatePromises);

  const userInfos: any = Object.values({
    ...messagesResult.userInfos,
    ...entriesResult.userInfos,
    ...threadsResult.userInfos,
  });

  const serverRequests = [];
  if (viewerMissingPlatform) {
    serverRequests.push({ type: serverRequestTypes.PLATFORM });
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

export {
  pingResponder,
};
