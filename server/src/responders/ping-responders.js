// @flow

import type { PingRequest, PingResponse } from 'lib/types/ping-types';
import { defaultNumberPerThread } from 'lib/types/message-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { validateInput, tShape } from '../utils/validation-utils';
import { entryQueryInputValidator } from './entry-responders';
import { fetchMessageInfosSince } from '../fetchers/message-fetchers';
import { verifyThreadID, fetchThreadInfos } from '../fetchers/thread-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { updateActivityTime } from '../updaters/activity-updaters';
import { fetchCurrentUserInfo } from '../fetchers/user-fetchers';

const pingRequestInputValidator = tShape({
  calendarQuery: entryQueryInputValidator,
  lastPing: t.Number,
  watchedIDs: t.list(t.String),
});

async function pingResponder(
  viewer: Viewer,
  input: any,
): Promise<PingResponse> {
  const request: PingRequest = input;
  validateInput(pingRequestInputValidator, request);

  const navID = request.calendarQuery.navID;
  let validNav = navID === "home";
  if (!validNav) {
    validNav = await verifyThreadID(navID);
  }
  if (!validNav) {
    throw new ServerError('invalid_parameters');
  }

  const newPingTime = Date.now();

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
  ] = await Promise.all([
    fetchMessageInfosSince(
      viewer,
      threadSelectionCriteria,
      request.lastPing,
      defaultNumberPerThread,
    ),
    fetchThreadInfos(viewer),
    fetchEntryInfos(viewer, request.calendarQuery),
    fetchCurrentUserInfo(viewer),
  ]);

  // Do this one separately in case any of the above throw an exception
  await updateActivityTime(viewer, newPingTime);

  const userInfos: any = Object.values({
    ...messagesResult.userInfos,
    ...entriesResult.userInfos,
    ...threadsResult.userInfos,
  });

  return {
    threadInfos: threadsResult.threadInfos,
    currentUserInfo,
    rawMessageInfos: messagesResult.rawMessageInfos,
    truncationStatuses: messagesResult.truncationStatuses,
    serverTime: newPingTime,
    rawEntryInfos: entriesResult.rawEntryInfos,
    userInfos,
  };
}

export {
  pingResponder,
};
