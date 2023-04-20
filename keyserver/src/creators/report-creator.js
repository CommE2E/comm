// @flow

import _isEqual from 'lodash/fp/isEqual.js';

import bots from 'lib/facts/bots.js';
import {
  filterRawEntryInfosByCalendarQuery,
  serverEntryInfosObject,
} from 'lib/shared/entry-utils.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import {
  type ReportCreationRequest,
  type ReportCreationResponse,
  type ThreadInconsistencyReportCreationRequest,
  type EntryInconsistencyReportCreationRequest,
  type UserInconsistencyReportCreationRequest,
  reportTypes,
} from 'lib/types/report-types.js';
import { values } from 'lib/utils/objects.js';
import {
  sanitizeReduxReport,
  type ReduxCrashReport,
} from 'lib/utils/sanitization.js';

import createIDs from './id-creator.js';
import createMessages from './message-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { fetchUsername } from '../fetchers/user-fetchers.js';
import { handleAsyncPromise } from '../responders/handlers.js';
import { createBotViewer } from '../session/bots.js';
import type { Viewer } from '../session/viewer.js';
import { getAndAssertCommAppURLFacts } from '../utils/urls.js';

const { commbot } = bots;

async function createReport(
  viewer: Viewer,
  request: ReportCreationRequest,
): Promise<?ReportCreationResponse> {
  const shouldIgnore = await ignoreReport(viewer, request);
  if (shouldIgnore) {
    return null;
  }
  const [id] = await createIDs('reports', 1);
  let type, report, time;
  if (request.type === reportTypes.THREAD_INCONSISTENCY) {
    ({ type, time, ...report } = request);
    time = time ? time : Date.now();
  } else if (request.type === reportTypes.ENTRY_INCONSISTENCY) {
    ({ type, time, ...report } = request);
  } else if (request.type === reportTypes.MEDIA_MISSION) {
    ({ type, time, ...report } = request);
  } else if (request.type === reportTypes.USER_INCONSISTENCY) {
    ({ type, time, ...report } = request);
  } else {
    ({ type, ...report } = request);
    time = Date.now();
    const redactedReduxReport: ReduxCrashReport = sanitizeReduxReport({
      preloadedState: report.preloadedState,
      currentState: report.currentState,
      actions: report.actions,
    });
    report = {
      ...report,
      ...redactedReduxReport,
    };
  }
  const row = [
    id,
    viewer.id,
    type,
    request.platformDetails.platform,
    JSON.stringify(report),
    time,
  ];
  const query = SQL`
    INSERT INTO reports (id, user, type, platform, report, creation_time)
    VALUES ${[row]}
  `;
  await dbQuery(query);
  handleAsyncPromise(sendCommbotMessage(viewer, request, id));
  return { id };
}

async function sendCommbotMessage(
  viewer: Viewer,
  request: ReportCreationRequest,
  reportID: string,
): Promise<void> {
  const canGenerateMessage = getCommbotMessage(request, reportID, null);
  if (!canGenerateMessage) {
    return;
  }
  const username = await fetchUsername(viewer.id);
  const message = getCommbotMessage(request, reportID, username);
  if (!message) {
    return;
  }
  const time = Date.now();
  await createMessages(createBotViewer(commbot.userID), [
    {
      type: messageTypes.TEXT,
      threadID: commbot.staffThreadID,
      creatorID: commbot.userID,
      time,
      text: message,
    },
  ]);
}

async function ignoreReport(
  viewer: Viewer,
  request: ReportCreationRequest,
): Promise<boolean> {
  // The below logic is to avoid duplicate inconsistency reports
  if (
    request.type !== reportTypes.THREAD_INCONSISTENCY &&
    request.type !== reportTypes.ENTRY_INCONSISTENCY
  ) {
    return false;
  }
  const { type, platformDetails, time } = request;
  if (!time) {
    return false;
  }
  const { platform } = platformDetails;
  const query = SQL`
    SELECT id
    FROM reports
    WHERE user = ${viewer.id} AND type = ${type}
      AND platform = ${platform} AND creation_time = ${time}
  `;
  const [result] = await dbQuery(query);
  return result.length !== 0;
}

function getCommbotMessage(
  request: ReportCreationRequest,
  reportID: string,
  username: ?string,
): ?string {
  const name = username ? username : '[null]';
  const { platformDetails } = request;
  const { platform, codeVersion } = platformDetails;
  const platformString = codeVersion ? `${platform} v${codeVersion}` : platform;
  if (request.type === reportTypes.ERROR) {
    const { baseDomain, basePath } = getAndAssertCommAppURLFacts();
    return (
      `${name} got an error :(\n` +
      `using ${platformString}\n` +
      `${baseDomain}${basePath}download_error_report/${reportID}`
    );
  } else if (request.type === reportTypes.THREAD_INCONSISTENCY) {
    const nonMatchingThreadIDs = getInconsistentThreadIDsFromReport(request);
    const nonMatchingString = [...nonMatchingThreadIDs].join(', ');
    return (
      `system detected inconsistency for ${name}!\n` +
      `using ${platformString}\n` +
      `occurred during ${request.action.type}\n` +
      `thread IDs that are inconsistent: ${nonMatchingString}`
    );
  } else if (request.type === reportTypes.ENTRY_INCONSISTENCY) {
    const nonMatchingEntryIDs = getInconsistentEntryIDsFromReport(request);
    const nonMatchingString = [...nonMatchingEntryIDs].join(', ');
    return (
      `system detected inconsistency for ${name}!\n` +
      `using ${platformString}\n` +
      `occurred during ${request.action.type}\n` +
      `entry IDs that are inconsistent: ${nonMatchingString}`
    );
  } else if (request.type === reportTypes.USER_INCONSISTENCY) {
    const nonMatchingUserIDs = getInconsistentUserIDsFromReport(request);
    const nonMatchingString = [...nonMatchingUserIDs].join(', ');
    return (
      `system detected inconsistency for ${name}!\n` +
      `using ${platformString}\n` +
      `occurred during ${request.action.type}\n` +
      `user IDs that are inconsistent: ${nonMatchingString}`
    );
  } else if (request.type === reportTypes.MEDIA_MISSION) {
    const mediaMissionJSON = JSON.stringify(request.mediaMission);
    const success = request.mediaMission.result.success
      ? 'media mission success!'
      : 'media mission failed :(';
    return `${name} ${success}\n` + mediaMissionJSON;
  } else {
    return null;
  }
}

function findInconsistentObjectKeys<O>(
  first: { +[id: string]: O },
  second: { +[id: string]: O },
): Set<string> {
  const nonMatchingIDs = new Set();
  for (const id in first) {
    if (!_isEqual(first[id])(second[id])) {
      nonMatchingIDs.add(id);
    }
  }
  for (const id in second) {
    if (!first[id]) {
      nonMatchingIDs.add(id);
    }
  }
  return nonMatchingIDs;
}

function getInconsistentThreadIDsFromReport(
  request: ThreadInconsistencyReportCreationRequest,
): Set<string> {
  const { pushResult, beforeAction } = request;
  return findInconsistentObjectKeys(beforeAction, pushResult);
}

function getInconsistentEntryIDsFromReport(
  request: EntryInconsistencyReportCreationRequest,
): Set<string> {
  const { pushResult, beforeAction, calendarQuery } = request;
  const filteredBeforeAction = filterRawEntryInfosByCalendarQuery(
    serverEntryInfosObject(values(beforeAction)),
    calendarQuery,
  );
  const filteredAfterAction = filterRawEntryInfosByCalendarQuery(
    serverEntryInfosObject(values(pushResult)),
    calendarQuery,
  );
  return findInconsistentObjectKeys(filteredBeforeAction, filteredAfterAction);
}

function getInconsistentUserIDsFromReport(
  request: UserInconsistencyReportCreationRequest,
): Set<string> {
  const { beforeStateCheck, afterStateCheck } = request;
  return findInconsistentObjectKeys(beforeStateCheck, afterStateCheck);
}

export default createReport;
