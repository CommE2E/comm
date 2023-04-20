// @flow

import bots from 'lib/facts/bots.js';
import { createMessageQuote } from 'lib/shared/message-utils.js';
import { type MessageReportCreationRequest } from 'lib/types/message-report-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import type { ServerThreadInfo } from 'lib/types/thread-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { promiseAll } from 'lib/utils/promises.js';

import createMessages from './message-creator.js';
import { createCommbotThread } from '../bots/commbot.js';
import { fetchMessageInfoByID } from '../fetchers/message-fetchers.js';
import {
  fetchPersonalThreadID,
  serverThreadInfoFromMessageInfo,
} from '../fetchers/thread-fetchers.js';
import {
  fetchUsername,
  fetchKeyserverAdminID,
} from '../fetchers/user-fetchers.js';
import type { Viewer } from '../session/viewer.js';

const { commbot } = bots;

type MessageReportData = {
  +reportedMessageText: ?string,
  +reporterUsername: ?string,
  +commbotThreadID: string,
  +reportedThread: ?ServerThreadInfo,
  +reportedMessageAuthor: ?string,
};

async function createMessageReport(
  viewer: Viewer,
  request: MessageReportCreationRequest,
): Promise<RawMessageInfo[]> {
  const {
    reportedMessageText,
    reporterUsername,
    commbotThreadID,
    reportedThread,
    reportedMessageAuthor,
  } = await fetchMessageReportData(viewer, request);

  const reportMessage = getCommbotMessage(
    reporterUsername,
    reportedMessageAuthor,
    reportedThread?.name,
    reportedMessageText,
  );
  const time = Date.now();
  const result = await createMessages(viewer, [
    {
      type: messageTypes.TEXT,
      threadID: commbotThreadID,
      creatorID: commbot.userID,
      time,
      text: reportMessage,
    },
  ]);
  if (result.length === 0) {
    throw new ServerError('message_report_failed');
  }
  return result;
}

async function fetchMessageReportData(
  viewer: Viewer,
  request: MessageReportCreationRequest,
): Promise<MessageReportData> {
  const keyserverAdminIDPromise = fetchKeyserverAdminID();
  const reportedMessagePromise = fetchMessageInfoByID(
    viewer,
    request.messageID,
  );
  const promises = {};

  promises.viewerUsername = fetchUsername(viewer.id);

  const keyserverAdminID = await keyserverAdminIDPromise;
  if (!keyserverAdminID) {
    throw new ServerError('keyserver_admin_not_found');
  }
  promises.commbotThreadID = getCommbotThreadID(keyserverAdminID);

  const reportedMessage = await reportedMessagePromise;

  if (reportedMessage) {
    promises.reportedThread = serverThreadInfoFromMessageInfo(reportedMessage);
  }

  const reportedMessageAuthorID = reportedMessage?.creatorID;
  if (reportedMessageAuthorID) {
    promises.reportedMessageAuthor = fetchUsername(reportedMessageAuthorID);
  }

  const reportedMessageText =
    reportedMessage?.type === 0 ? reportedMessage.text : null;

  const {
    viewerUsername,
    commbotThreadID,
    reportedThread,
    reportedMessageAuthor,
  } = await promiseAll(promises);

  return {
    reportedMessageText,
    reporterUsername: viewerUsername,
    commbotThreadID,
    reportedThread,
    reportedMessageAuthor,
  };
}

async function getCommbotThreadID(userID: string): Promise<string> {
  const commbotThreadID = await fetchPersonalThreadID(userID, commbot.userID);
  return commbotThreadID ?? createCommbotThread(userID);
}

function getCommbotMessage(
  reporterUsername: ?string,
  messageAuthorUsername: ?string,
  threadName: ?string,
  message: ?string,
): string {
  reporterUsername = reporterUsername ?? '[null]';
  const messageAuthor = messageAuthorUsername
    ? `${messageAuthorUsername}’s`
    : 'this';
  const thread = threadName ? `chat titled "${threadName}"` : 'chat';
  const reply = message ? createMessageQuote(message) : 'non-text message';
  return (
    `${reporterUsername} reported ${messageAuthor} message in ${thread}\n` +
    reply
  );
}

export default createMessageReport;
