// @flow

import { messageTypes } from 'lib/types/message-types';

import invariant from 'invariant';

import version from 'lib/facts/version';
import bots from 'lib/facts/bots';
import { promiseAll } from 'lib/utils/promises'

import { dbQuery, SQL } from '../database';
import { createSquadbotThread } from './squadbot';
import createMessages from '../creators/message-creator';
import { createBotViewer } from '../session/bots';

const { currentCodeVersion } = version;
const thirtyDays = 30 * 24 * 60 * 60 * 1000;
const { squadbot } = bots;

async function botherMonthlyActivesToUpdateAppVersion(): Promise<void> {
  const cutoff = Date.now() - thirtyDays;
  const query = SQL`
    SELECT x.user, x.min_code_version, MIN(t.id) AS squadbot_thread
    FROM (
      SELECT s.user,
        MIN(JSON_EXTRACT(c.versions, "$.codeVersion")) AS min_code_version
      FROM sessions s
      LEFT JOIN cookies c ON c.id = s.cookie
      WHERE s.last_update > ${cutoff} AND c.platform != "web"
      GROUP BY s.user
    ) x
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
    WHERE x.min_code_version < ${currentCodeVersion}
    GROUP BY x.user, x.min_code_version
  `;
  const [ result ] = await dbQuery(query);

  const codeVersions = new Map();
  const squadbotThreads = new Map();
  const usersToSquadbotThreadPromises = {};
  for (let row of result) {
    const userID = row.user.toString();
    const minCodeVersion = row.min_code_version;
    const squadbotThread = row.squadbot_thread.toString();
    codeVersions.set(userID, minCodeVersion);
    if (squadbotThread) {
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
  for (let [ userID, threadID ] of squadbotThreads) {
    const codeVersion = codeVersions.get(userID);
    invariant(codeVersion, "should be set");
    newMessageDatas.push({
      type: messageTypes.TEXT,
      threadID,
      creatorID: squadbot.userID,
      time,
      text: `beep boop, I'm a bot! one or more of your devices is on an old ` +
        `version (v${codeVersion}). any chance you could update it? on ` +
        `Android you do this using the Play Store, same as any other app. on ` +
        `iOS, you need to open up the Testflight app and update from there. ` +
        `thanks for helping test!`,
    });
  }

  const squadbotViewer = createBotViewer(squadbot.userID);
  await createMessages(squadbotViewer, newMessageDatas);
}

export {
  botherMonthlyActivesToUpdateAppVersion,
};
