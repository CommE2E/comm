// @flow

import type { $Response, $Request } from 'express';
import type { PingRequest, PingResponse } from 'lib/types/ping-types';
import { defaultNumberPerThread } from 'lib/types/message-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { tShape } from '../utils/tcomb-utils';
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
  clientSupportsMessages: t.Boolean,
});

async function pingResponder(
  req: $Request,
  res: $Response,
): Promise<PingResponse> {
  const pingRequest: PingRequest = (req.body: any);
  if (!pingRequestInputValidator.is(pingRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const navID = pingRequest.calendarQuery.navID;
  let validNav = navID === "home";
  if (!validNav) {
    validNav = await verifyThreadID(navID);
  }
  if (!validNav) {
    throw new ServerError('invalid_parameters');
  }

  const newPingTime = Date.now();

  const threadCursors = {};
  for (let watchedThreadID of pingRequest.watchedIDs) {
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
      threadSelectionCriteria,
      pingRequest.lastPing,
      defaultNumberPerThread,
    ),
    fetchThreadInfos(),
    fetchEntryInfos(pingRequest.calendarQuery),
    fetchCurrentUserInfo(),
  ]);

  // Do this one separately in case any of the above throw an exception
  await updateActivityTime(newPingTime, pingRequest.clientSupportsMessages);

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
