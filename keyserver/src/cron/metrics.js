// @flow

import bots from 'lib/facts/bots.js';
import { messageTypes } from 'lib/types/message-types-enum.js';

import createMessages from '../creators/message-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { createScriptViewer } from '../session/scripts.js';

const metricsChannel = '80820870';
const millisecondsPerDay = 24 * 60 * 60 * 1000;

async function postMetrics() {
  if (!process.env.RUN_COMM_TEAM_DEV_SCRIPTS) {
    // This is a job that the Comm internal team uses
    return;
  }

  const oneDayAgo = Date.now() - millisecondsPerDay;
  const thirtyDaysAgo = Date.now() - millisecondsPerDay * 30;
  const [
    dailyActives,
    monthlyActives,
    lastDayOneWeekRetention,
    lastDayTwoWeekRetention,
    lastWeekThreeWeekRetention,
    lastDayRetentionSinceLaunch,
    lastWeekRetentionSinceLaunch,
  ] = await Promise.all([
    getActiveCountSince(oneDayAgo),
    getActiveCountSince(thirtyDaysAgo),
    getRetention(7, 6, 1),
    getRetention(14, 13, 1),
    getRetention(21, 14, 7),
    getRetentionSinceLaunch(1),
    getRetentionSinceLaunch(7),
  ]);

  const metrics = {
    'DAUs': dailyActives,
    'MAUs': monthlyActives,
    'D7 (daily)': lastDayOneWeekRetention,
    'D14 (daily)': lastDayTwoWeekRetention,
    'D21 (weekly)': lastWeekThreeWeekRetention,
    'daily retention since launch': lastDayRetentionSinceLaunch,
    'weekly retention since launch': lastWeekRetentionSinceLaunch,
  };
  const today = new Date().toLocaleString('default', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const metricText =
    `### Metrics for ${today}\n` +
    '```\n' +
    `${JSON.stringify(metrics, undefined, 2)}\n` +
    '```';

  const viewer = createScriptViewer(bots.commbot.userID);
  const messageDatas = [
    {
      type: messageTypes.TEXT,
      threadID: metricsChannel,
      creatorID: bots.commbot.userID,
      time: Date.now(),
      text: metricText,
    },
  ];
  await createMessages(viewer, messageDatas);
}

async function getActiveCountSince(time: number): Promise<number> {
  const [result] = await dbQuery(SQL`
    SELECT COUNT(DISTINCT u.id) AS count
    FROM users u
    LEFT JOIN cookies c ON c.user = u.id
    WHERE last_used IS NOT NULL AND last_used > ${time}
  `);
  const [row] = result;
  return row.count;
}

// Of the users that created their account between N and M days ago,
// how many were active in the X days?
type RetentionResult = { +retainedCount: number, +totalCount: number };
async function getRetention(
  registeredDaysAgoStart: number,
  registeredDaysAgoEnd: number,
  activityCheckDaysAgo: number,
): Promise<RetentionResult> {
  const startOfRegistrationPeriod =
    Date.now() - millisecondsPerDay * registeredDaysAgoStart;
  const endOfRegistrationPeriod =
    Date.now() - millisecondsPerDay * registeredDaysAgoEnd;
  const [result] = await dbQuery(SQL`
    SELECT u.id, MAX(c.last_used) AS lastUsed
    FROM users u
    LEFT JOIN cookies c ON c.user = u.id
    WHERE u.creation_time >= ${startOfRegistrationPeriod}
      AND u.creation_time < ${endOfRegistrationPeriod}
    GROUP BY u.id
  `);

  const totalCount = result.length;

  const oneDayAgo = Date.now() - millisecondsPerDay * activityCheckDaysAgo;
  const retainedCount = result.filter(
    ({ lastUsed }) => lastUsed > oneDayAgo,
  ).length;

  return { retainedCount, totalCount };
}

// We're measuring users that signed up in the 7 days following launch.
// They count as retained if they've used Comm in the last day.
async function getRetentionSinceLaunch(
  activityCheckDaysAgo: number,
): Promise<RetentionResult> {
  const launchDate = new Date('2024-10-03');
  const launchDaysAgo = Math.ceil(
    (Date.now() - launchDate.getTime()) / millisecondsPerDay,
  );

  const retentionPromises: Array<Promise<RetentionResult>> = [];
  for (let i = 0; i < 7; i++) {
    retentionPromises.push(
      getRetention(
        launchDaysAgo - i,
        launchDaysAgo - i - 1,
        activityCheckDaysAgo,
      ),
    );
  }

  const totalRetentionResults = {
    retainedCount: 0,
    totalCount: 0,
  };
  const retentionResults = await Promise.all(retentionPromises);
  for (const retentionResult of retentionResults) {
    totalRetentionResults.retainedCount += retentionResult.retainedCount;
    totalRetentionResults.totalCount += retentionResult.totalCount;
  }
  return totalRetentionResults;
}

export { postMetrics };
