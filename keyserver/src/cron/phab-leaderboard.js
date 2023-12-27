// @flow

import mysql from 'mysql2/promise.js';

import bots from 'lib/facts/bots.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import { getCommConfig } from 'lib/utils/comm-config.js';

import createMessages from '../creators/message-creator.js';
import { SQL } from '../database/database.js';
import { createScriptViewer } from '../session/scripts.js';

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

const phabLeaderboardChannel = '6910797';

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
    '### Phabricator leaderboard for ' +
    `${date.toLocaleString('default', dateTimeFormatOptions)}:\n` +
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
  try {
    const monthlyLineCountPromise = getLineCountLeaderboard(
      conn,
      startOfLastMonth.getTime() / 1000,
      startOfThisMonth.getTime() / 1000,
    );
    const yearlyLineCountPromise: Promise<?LineCountLeaderboard> =
      (async () => {
        if (startOfThisMonth.getMonth() !== 0) {
          return undefined;
        }
        return await getLineCountLeaderboard(
          conn,
          startOfLastYear.getTime() / 1000,
          startOfThisMonth.getTime() / 1000,
        );
      })();
    [monthlyLineCountResults, yearlyLineCountResults] = await Promise.all([
      monthlyLineCountPromise,
      yearlyLineCountPromise,
    ]);
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

  await createMessages(viewer, messageDatas);
}

export { postLeaderboard };
