// @flow

import type { PingRequest, PingResponse } from 'lib/types/ping-types';
import { defaultNumberPerThread } from 'lib/types/message-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';
import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils';
import { mostRecentUpdateTimestamp } from 'lib/shared/update-utils';

import { validateInput, tShape } from '../utils/validation-utils';
import { entryQueryInputValidator } from './entry-responders';
import { fetchMessageInfosSince } from '../fetchers/message-fetchers';
import { verifyThreadID, fetchThreadInfos } from '../fetchers/thread-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { updateActivityTime } from '../updaters/activity-updaters';
import { fetchCurrentUserInfo } from '../fetchers/user-fetchers';
import { fetchUpdateInfos } from '../fetchers/update-fetchers';
import { recordDeliveredUpdate } from '../session/cookies';

const pingRequestInputValidator = tShape({
  calendarQuery: entryQueryInputValidator,
  lastPing: t.maybe(t.Number), // deprecated
  messagesCurrentAsOf: t.maybe(t.Number),
  updatesCurrentAsOf: t.maybe(t.Number),
  watchedIDs: t.list(t.String),
});

async function pingResponder(
  viewer: Viewer,
  input: any,
): Promise<PingResponse> {
  const request: PingRequest = input;
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
  if (!clientMessagesCurrentAsOf) {
    throw new ServerError('invalid_parameters');
  }

  const navID = request.calendarQuery.navID;
  let validNav = navID === "home";
  if (!validNav) {
    validNav = await verifyThreadID(navID);
  }
  if (!validNav) {
    throw new ServerError('invalid_parameters');
  }

  const threadCursors = {};
  for (let watchedThreadID of request.watchedIDs) {
    threadCursors[watchedThreadID] = null;
  }
  const threadSelectionCriteria = { threadCursors, joinedThreads: true };

  const [
    messagesResult,
    threadsResult,
    entriesResult,
    currentUserInfo,
    newUpdates,
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
    request.updatesCurrentAsOf
      ? fetchUpdateInfos(viewer, request.updatesCurrentAsOf)
      : null,
  ]);

  let updatesResult = null;
  const timestampUpdatePromises = [ updateActivityTime(viewer) ];
  if (newUpdates) {
    invariant(request.updatesCurrentAsOf, "should be set");
    const updatesCurrentAsOf = mostRecentUpdateTimestamp(
      newUpdates,
      request.updatesCurrentAsOf,
    );
    if (newUpdates.length > 0) {
      timestampUpdatePromises.push(
        recordDeliveredUpdate(viewer.cookieID, updatesCurrentAsOf),
      );
    }
    updatesResult = {
      newUpdates,
      currentAsOf: updatesCurrentAsOf,
    };
  }
  await Promise.all(timestampUpdatePromises);

  const userInfos: any = Object.values({
    ...messagesResult.userInfos,
    ...entriesResult.userInfos,
    ...threadsResult.userInfos,
  });

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
  };
  if (updatesResult) {
    response.updatesResult = updatesResult;
  }
  return response;
}

export {
  pingResponder,
};
