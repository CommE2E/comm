// @flow

import { messageTypes } from 'lib/types/message-types';

import invariant from 'invariant';

import bots from 'lib/facts/bots';
import { promiseAll } from 'lib/utils/promises';

import { dbQuery, SQL } from '../database';
import { createSquadbotThread } from './squadbot';
import createMessages from '../creators/message-creator';
import { createBotViewer } from '../session/bots';

const thirtyDays = 30 * 24 * 60 * 60 * 1000;
const { squadbot } = bots;

async function botherMonthlyActivesToUpdateAppVersion(): Promise<void> {
  const cutoff = Date.now() - thirtyDays;
  const query = SQL`
    SELECT x.user,
      MIN(x.max_code_version) AS code_version,
      MIN(t.id) AS squadbot_thread
    FROM (
      SELECT s.user, c.platform,
        MAX(JSON_EXTRACT(c.versions, "$.codeVersion")) AS max_code_version
      FROM sessions s
      LEFT JOIN cookies c ON c.id = s.cookie
      WHERE s.last_update > ${cutoff}
        AND c.platform != "web"
        AND JSON_EXTRACT(c.versions, "$.codeVersion") IS NOT NULL
      GROUP BY s.user, c.platform
    ) x
    LEFT JOIN versions v ON v.platform = x.platform AND v.code_version = (
      SELECT MAX(code_version)
      FROM versions
      WHERE platform = x.platform AND deploy_time IS NOT NULL
    )
    LEFT JOIN (
      SELECT t.id, m1.user, COUNT(m3.user) AS user_count
      FROM threads t
      LEFT JOIN memberships m1 ON m1.thread = t.id
        AND m1.user != ${squadbot.userID}
      LEFT JOIN memberships m2 ON m2.thread = t.id
        AND m2.user = ${squadbot.userID}
      LEFT JOIN memberships m3 ON m3.thread = t.id
      WHERE m1.user IS NOT NULL AND m2.user IS NOT NULL
      GROUP BY t.id, m1.user
    ) t ON t.user = x.user AND t.user_count = 2
    WHERE v.id IS NOT NULL AND x.max_code_version < v.code_version
    GROUP BY x.user
  `;
  const [result] = await dbQuery(query);

  const codeVersions = new Map();
  const squadbotThreads = new Map();
  const usersToSquadbotThreadPromises = {};
  for (let row of result) {
    const userID = row.user.toString();
    const codeVersion = row.code_version;
    codeVersions.set(userID, codeVersion);
    if (row.squadbot_thread) {
      const squadbotThread = row.squadbot_thread.toString();
      squadbotThreads.set(userID, squadbotThread);
    } else {
      usersToSquadbotThreadPromises[userID] = createSquadbotThread(userID);
    }
  }

  const newSquadbotThreads = await promiseAll(usersToSquadbotThreadPromises);
  for (let userID in newSquadbotThreads) {
    squadbotThreads.set(userID, newSquadbotThreads[userID]);
  }

  const time = Date.now();
  const newMessageDatas = [];
  for (let [userID, threadID] of squadbotThreads) {
    const codeVersion = codeVersions.get(userID);
    invariant(codeVersion, 'should be set');
    newMessageDatas.push({
      type: messageTypes.TEXT,
      threadID,
      creatorID: squadbot.userID,
      time,
      text:
        `beep boop, I'm a bot! one or more of your devices is on an old ` +
        `version (v${codeVersion}). any chance you could update it? on ` +
        `Android you do this using the Play Store, same as any other app. on ` +
        `iOS, you need to open up the Testflight app and update from there. ` +
        `thanks for helping test!`,
    });
  }

  const squadbotViewer = createBotViewer(squadbot.userID);
  await createMessages(squadbotViewer, newMessageDatas);
}

export { botherMonthlyActivesToUpdateAppVersion };
