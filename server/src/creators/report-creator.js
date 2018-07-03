// @flow

import type { Viewer } from '../session/viewer';
import {
  type ReportCreationRequest,
  type ReportCreationResponse,
  reportTypes,
} from 'lib/types/report-types';
import { messageTypes } from 'lib/types/message-types';

import bots from 'lib/facts/bots';
import _isEqual from 'lodash/fp/isEqual';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';
import { fetchUsername } from '../fetchers/user-fetchers';
import urlFacts from '../../facts/url';
import createMessages from './message-creator';
import { handleAsyncPromise } from '../responders/handlers';

const { baseDomain, basePath, https } = urlFacts;
const { squadbot } = bots;

async function createReport(
  viewer: Viewer,
  request: ReportCreationRequest,
): Promise<ReportCreationResponse> {
  const [ id ] = await createIDs("reports", 1);
  const { type, platformDetails, ...report } = request;
  const row = [
    id,
    viewer.id,
    type,
    platformDetails.platform,
    JSON.stringify(report),
    Date.now(),
  ];
  const query = SQL`
    INSERT INTO reports (id, user, type, platform, report, creation_time)
    VALUES ${[row]}
  `;
  await dbQuery(query);
  handleAsyncPromise(sendSquadbotMessage(viewer, request, id));
  return { id };
}

async function sendSquadbotMessage(
  viewer: Viewer,
  request: ReportCreationRequest,
  reportID: string,
): Promise<void> {
  const canGenerateMessage = getSquadbotMessage(request, reportID, null);
  if (!canGenerateMessage) {
    return;
  }
  const username = await fetchUsername(viewer.id);
  const message = getSquadbotMessage(request, reportID, username);
  if (!message) {
    return;
  }
  const time = Date.now();
  await createMessages([{
    type: messageTypes.TEXT,
    threadID: squadbot.ashoatThreadID,
    creatorID: squadbot.userID,
    time,
    text: message,
  }]);
}

function getSquadbotMessage(
  request: ReportCreationRequest,
  reportID: string,
  username: ?string,
): ?string {
  const name = username ? username : "[null]";
  const { platformDetails } = request;
  const { platform, codeVersion } = platformDetails;
  const platformString = codeVersion ? `${platform} v${codeVersion}` : platform;
  if (request.type === reportTypes.ERROR) {
    const protocol = https ? "https" : "http";
    return `${name} got an error :(\n` +
      `using ${platformString}\n` +
      `${baseDomain}${basePath}download_error_report/${reportID}`;
  } else if (request.type === reportTypes.THREAD_POLL_PUSH_INCONSISTENCY) {
    const { pushResult, pollResult, action } = request;
    const nonMatchingThreadIDs = new Set();
    for (let threadID in pollResult) {
      if (!_isEqual(pushResult[threadID])(pollResult[threadID])) {
        nonMatchingThreadIDs.add(threadID);
      }
    }
    for (let threadID in pushResult) {
      if (!pollResult[threadID]) {
        nonMatchingThreadIDs.add(threadID);
      }
    }
    const nonMatchingString = [...nonMatchingThreadIDs].join(", ");
    return `system detected poll/push inconsistency for ${name}!\n` +
      `using ${platformString}\n` +
      `occurred during ${action.type}\n` +
      `thread IDs that are inconsistent: ${nonMatchingString}`;
  } else {
    return null;
  }
}

export default createReport;
