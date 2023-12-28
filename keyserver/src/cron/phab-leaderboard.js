// @flow

import mysql from 'mysql2/promise.js';

import bots from 'lib/facts/bots.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import { getCommConfig } from 'lib/utils/comm-config.js';

import createMessages from '../creators/message-creator.js';
import { SQL } from '../database/database.js';
import { createScriptViewer } from '../session/scripts.js';

const phabLeaderboardChannel = '6910797';

type PhabDBConfig = {
  +host: string,
  +user: string,
  +password: string,
};

type DBConnection = {
  +query: string => Promise<Array<Array<any>>>,
  ...
};

type LineCountLeaderboard = Array<{
  +username: string,
  +add_line_count: string,
  +del_line_count: string,
  +total_line_count: string,
}>;
async function getLineCountLeaderboard(
  conn: DBConnection,
  startTime: number,
  endTime: number,
): Promise<LineCountLeaderboard> {
  const query = SQL`
    SELECT d.username,
      SUM(d.add_line_count) AS add_line_count,
      SUM(d.del_line_count) AS del_line_count,
      SUM(d.add_line_count + d.del_line_count) AS total_line_count
    FROM (
      SELECT r.id AS revision_id,
        u.userName AS username,
        r.lineCount AS revision_line_count,
        d.id AS diff_id,
        c.id AS changeset_id,
        SUM(c.addLines) AS add_line_count,
        SUM(c.delLines) AS del_line_count,
        MAX(t.id) AS close_id
      FROM phabricator_differential.differential_revision r
      LEFT JOIN phabricator_differential.differential_diff d
        ON d.phid = r.activeDiffPHID
      LEFT JOIN phabricator_differential.differential_changeset c
        ON c.diffID = d.id
      LEFT JOIN phabricator_user.user u
        ON u.phid = r.authorPHID
      LEFT JOIN phabricator_differential.differential_transaction t
        ON t.objectPHID = r.phid
          AND t.transactionType = 'differential.revision.close'
      WHERE r.status = 'published'
        AND JSON_EXTRACT(
            c.metadata,
            '$."attributes.untrusted".generated'
          ) IS NULL
        AND c.filename NOT LIKE '%.lock'
        AND c.filename NOT LIKE '%_generated/%'
      GROUP BY r.id
      ORDER BY r.id DESC
    ) d
    LEFT JOIN phabricator_differential.differential_transaction c
      ON c.id = d.close_id
    WHERE c.dateModified >= ${startTime} AND c.dateModified < ${endTime}
    GROUP BY d.username
    ORDER BY add_line_count DESC;
  `;
  const [results] = await conn.query(query);
  return results;
}

function messageForLineCountLeaderboard(
  leaderboard: LineCountLeaderboard,
  date: Date,
  dateTimeFormatOptions: Intl$DateTimeFormatOptions,
) {
  return (
    '### Line count leaderboard for ' +
    `${date.toLocaleString('default', dateTimeFormatOptions)}\n` +
    '```\n' +
    `${JSON.stringify(leaderboard, undefined, 2)}\n` +
    '```'
  );
}

type NumRevisionsLandedLeaderboard = Array<{
  +username: string,
  +num_revisions_landed: string,
}>;
async function getNumRevisionsLandedLeaderboard(
  conn: DBConnection,
  startTime: number,
  endTime: number,
): Promise<NumRevisionsLandedLeaderboard> {
  const query = SQL`
    SELECT u.userName AS username,
      COUNT(r.id) AS num_revisions_landed
    FROM phabricator_differential.differential_revision r
    LEFT JOIN phabricator_user.user u
      ON u.phid = r.authorPHID
    LEFT JOIN phabricator_differential.differential_transaction t
      ON t.objectPHID = r.phid
        AND t.transactionType = 'differential.revision.close'
    WHERE r.status = 'published'
      AND t.dateModified >= ${startTime} AND t.dateModified < ${endTime}
    GROUP BY u.userName
    ORDER BY num_revisions_landed DESC;
  `;
  const [results] = await conn.query(query);
  return results;
}

function messageForNumRevisionsLandedLeaderboard(
  leaderboard: NumRevisionsLandedLeaderboard,
  date: Date,
  dateTimeFormatOptions: Intl$DateTimeFormatOptions,
) {
  return (
    '### Total revisions landed for ' +
    `${date.toLocaleString('default', dateTimeFormatOptions)}\n` +
    '```\n' +
    `${JSON.stringify(leaderboard, undefined, 2)}\n` +
    '```'
  );
}

type NumRevisionsReviewedLeaderboard = Array<{
  +username: string,
  +num_revisions_reviewed: string,
}>;
async function getNumRevisionsReviewedLeaderboard(
  conn: DBConnection,
  startTime: number,
  endTime: number,
): Promise<NumRevisionsReviewedLeaderboard> {
  const query = SQL`
    SELECT x.username, COUNT(x.id) AS num_revisions_reviewed
    FROM (
      SELECT r.username, r.id, r.comment_time
      FROM (
        SELECT r.id,
          u.userName AS username,
          t.dateCreated AS comment_time,
          JSON_ARRAYAGG(t.transactionType) AS transactions
        FROM phabricator_differential.differential_revision r
        LEFT JOIN phabricator_differential.differential_transaction t
          ON t.objectPHID = r.phid
        LEFT JOIN phabricator_user.user u
          ON u.phid = t.authorPHID
        WHERE t.authorPHID != r.authorPHID
          AND u.userName IS NOT NULL
        GROUP BY r.id, u.userName, t.dateCreated
      ) r
      WHERE
        (
          NOT JSON_CONTAINS(transactions, '"differential.revision.resign"') OR
          JSON_CONTAINS(transactions, '"differential:inline"')
        )
        AND (
          JSON_CONTAINS(transactions, '"differential:inline"') OR
          JSON_CONTAINS(transactions, '"core:comment"') OR
          JSON_CONTAINS(transactions, '"differential.revision.status"')
        )
        AND r.comment_time >= ${startTime} AND r.comment_time < ${endTime}
      GROUP BY r.username, r.id
    ) x
    GROUP BY x.username
    ORDER BY num_revisions_reviewed DESC;
  `;
  const [results] = await conn.query(query);
  return results;
}

function messageForNumRevisionsReviewedLeaderboard(
  leaderboard: NumRevisionsReviewedLeaderboard,
  date: Date,
  dateTimeFormatOptions: Intl$DateTimeFormatOptions,
) {
  return (
    '### Review leaderboard for ' +
    `${date.toLocaleString('default', dateTimeFormatOptions)}\n` +
    '```\n' +
    `${JSON.stringify(leaderboard, undefined, 2)}\n` +
    '```'
  );
}

async function postLeaderboard() {
  if (!process.env.RUN_COMM_TEAM_DEV_SCRIPTS) {
    // This is a job that the Comm internal team uses
    return;
  }

  const currentDate = new Date();
  const startOfThisMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );

  const startOfLastMonth = new Date(startOfThisMonth);
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

  const startOfLastYear = new Date(startOfLastMonth);
  startOfLastYear.setMonth(0);

  const dbConfig = await getCommConfig<PhabDBConfig>({
    folder: 'secrets',
    name: 'phab_db_config',
  });
  const conn = await mysql.createConnection(dbConfig);

  let monthlyLineCountResults: ?LineCountLeaderboard;
  let yearlyLineCountResults: ?LineCountLeaderboard;
  let monthlyNumRevisionsLandedResults: ?NumRevisionsLandedLeaderboard;
  let yearlyNumRevisionsLandedResults: ?NumRevisionsLandedLeaderboard;
  let monthlyNumRevisionsReviewedResults: ?NumRevisionsReviewedLeaderboard;
  let yearlyNumRevisionsReviewedResults: ?NumRevisionsReviewedLeaderboard;
  try {
    const monthlyPromise = (async () => {
      const startTime = startOfLastMonth.getTime() / 1000;
      const endTime = startOfThisMonth.getTime() / 1000;
      return Promise.all([
        getLineCountLeaderboard(conn, startTime, endTime),
        getNumRevisionsLandedLeaderboard(conn, startTime, endTime),
        getNumRevisionsReviewedLeaderboard(conn, startTime, endTime),
      ]);
    })();
    const yearlyPromise: Promise<?[
      LineCountLeaderboard,
      NumRevisionsLandedLeaderboard,
      NumRevisionsReviewedLeaderboard,
    ]> = (async () => {
      if (startOfThisMonth.getMonth() !== 0) {
        return undefined;
      }
      const startTime = startOfLastYear.getTime() / 1000;
      const endTime = startOfThisMonth.getTime() / 1000;
      return Promise.all([
        getLineCountLeaderboard(conn, startTime, endTime),
        getNumRevisionsLandedLeaderboard(conn, startTime, endTime),
        getNumRevisionsReviewedLeaderboard(conn, startTime, endTime),
      ]);
    })();
    const [monthlyResults, yearlyResults] = await Promise.all([
      monthlyPromise,
      yearlyPromise,
    ]);
    [
      monthlyLineCountResults,
      monthlyNumRevisionsLandedResults,
      monthlyNumRevisionsReviewedResults,
    ] = monthlyResults;
    if (yearlyResults) {
      [
        yearlyLineCountResults,
        yearlyNumRevisionsLandedResults,
        yearlyNumRevisionsReviewedResults,
      ] = yearlyResults;
    }
  } finally {
    conn.end();
  }

  const viewer = createScriptViewer(bots.commbot.userID);

  const messageDatas = [
    {
      type: messageTypes.TEXT,
      threadID: phabLeaderboardChannel,
      creatorID: bots.commbot.userID,
      time: Date.now(),
      text: messageForLineCountLeaderboard(
        monthlyLineCountResults,
        startOfLastMonth,
        { month: 'long', year: 'numeric' },
      ),
    },
    {
      type: messageTypes.TEXT,
      threadID: phabLeaderboardChannel,
      creatorID: bots.commbot.userID,
      time: Date.now(),
      text: messageForNumRevisionsLandedLeaderboard(
        monthlyNumRevisionsLandedResults,
        startOfLastMonth,
        { month: 'long', year: 'numeric' },
      ),
    },
    {
      type: messageTypes.TEXT,
      threadID: phabLeaderboardChannel,
      creatorID: bots.commbot.userID,
      time: Date.now(),
      text: messageForNumRevisionsReviewedLeaderboard(
        monthlyNumRevisionsReviewedResults,
        startOfLastMonth,
        { month: 'long', year: 'numeric' },
      ),
    },
  ];
  if (yearlyLineCountResults) {
    messageDatas.push({
      type: messageTypes.TEXT,
      threadID: phabLeaderboardChannel,
      creatorID: bots.commbot.userID,
      time: Date.now(),
      text: messageForLineCountLeaderboard(
        yearlyLineCountResults,
        startOfLastYear,
        { year: 'numeric' },
      ),
    });
  }
  if (yearlyNumRevisionsLandedResults) {
    messageDatas.push({
      type: messageTypes.TEXT,
      threadID: phabLeaderboardChannel,
      creatorID: bots.commbot.userID,
      time: Date.now(),
      text: messageForNumRevisionsLandedLeaderboard(
        yearlyNumRevisionsLandedResults,
        startOfLastYear,
        { year: 'numeric' },
      ),
    });
  }
  if (yearlyNumRevisionsReviewedResults) {
    messageDatas.push({
      type: messageTypes.TEXT,
      threadID: phabLeaderboardChannel,
      creatorID: bots.commbot.userID,
      time: Date.now(),
      text: messageForNumRevisionsReviewedLeaderboard(
        yearlyNumRevisionsReviewedResults,
        startOfLastYear,
        { year: 'numeric' },
      ),
    });
  }

  await createMessages(viewer, messageDatas);
}

export { postLeaderboard };
