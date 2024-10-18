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
    oneWeekRetention,
    twoWeekRetention,
    retentionSinceLaunch,
  ] = await Promise.all([
    getActiveCountSince(oneDayAgo),
    getActiveCountSince(thirtyDaysAgo),
    getRetention(7),
    getRetention(14),
    getRetentionSinceLaunch(),
  ]);

  const metrics = {
    'DAUs': dailyActives,
    'MAUs': monthlyActives,
    'D7': oneWeekRetention,
    'D14': twoWeekRetention,
    'retention since launch': retentionSinceLaunch,
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

// Of the users that created their account N days ago,
// how many were active in the last day?
type RetentionResult = { +retainedCount: number, +totalCount: number };
async function getRetention(daysAgo: number): Promise<RetentionResult> {
  const startOfNDaysAgo = Date.now() - millisecondsPerDay * daysAgo;
  const endOfNDaysAgo = Date.now() - millisecondsPerDay * (daysAgo - 1);
  const [result] = await dbQuery(SQL`
    SELECT u.id, MAX(c.last_used) AS lastUsed
    FROM users u
    LEFT JOIN cookies c ON c.user = u.id
    WHERE u.creation_time >= ${startOfNDaysAgo}
      AND u.creation_time < ${endOfNDaysAgo}
    GROUP BY u.id
  `);

  const totalCount = result.length;

  const oneDayAgo = Date.now() - millisecondsPerDay;
  const retainedCount = result.filter(
    ({ lastUsed }) => lastUsed > oneDayAgo,
  ).length;

  return { retainedCount, totalCount };
}

// We're measuring users that signed up in the 7 days following launch.
// They count as retained if they've used Comm in the last day.
async function getRetentionSinceLaunch(): Promise<RetentionResult> {
  const launchDate = new Date('2024-10-03');
  const launchDaysAgo = Math.ceil(
    (Date.now() - launchDate.getTime()) / millisecondsPerDay,
  );

  const retentionPromises: Array<Promise<RetentionResult>> = [];
  for (let i = 0; i < 7; i++) {
    retentionPromises.push(getRetention(launchDaysAgo - i));
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
