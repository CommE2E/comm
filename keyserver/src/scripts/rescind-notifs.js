// @flow

import { threadTypes } from 'lib/types/thread-types.js';

import { dbQuery, SQL } from '../database/database.js';
import { createScriptViewer } from '../session/scripts.js';
import { activityUpdater } from '../updaters/activity-updaters.js';
import { main } from './utils.js';

async function rescindNotifs() {
  const fetchRescindThreadInfo = SQL`
    SELECT m.user, m.thread, m.last_message
    FROM users u
    INNER JOIN memberships m
      ON m.user = u.id
    INNER JOIN threads t
      ON t.id = m.thread
    WHERE t.type IN (${[threadTypes.PERSONAL, threadTypes.PRIVATE]})
  `;
  const [result] = await dbQuery(fetchRescindThreadInfo);

  const usersToActivityUpdates = new Map();
  for (const row of result) {
    const user = row.user.toString();
    let activityUpdates = usersToActivityUpdates.get(user);
    if (!activityUpdates) {
      activityUpdates = [];
      usersToActivityUpdates.set(user, activityUpdates);
    }
    activityUpdates.push({
      focus: false,
      threadID: row.thread.toString(),
      latestMessage: row.last_message.toString(),
    });
  }

  for (const [user, activityUpdates] of usersToActivityUpdates) {
    await activityUpdater(createScriptViewer(user), {
      updates: activityUpdates,
    });
  }
}

main([rescindNotifs]);
