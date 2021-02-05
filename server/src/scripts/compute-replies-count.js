// @flow

import { messageSpecs } from 'lib/shared/messages/message-specs';
import { messageTypes } from 'lib/types/message-types';
import { threadTypes } from 'lib/types/thread-types';
import { updateTypes } from 'lib/types/update-types';

import { createUpdates } from '../creators/update-creator';
import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function computeRepliesCount() {
  const includedMessageTypes = Object.keys(messageTypes)
    .map((key) => messageTypes[key])
    .filter((type) => messageSpecs[type].includedInRepliesCount);

  const sidebarMembersQuery = SQL`
    SELECT t.id AS threadID, m.user AS userID
    FROM threads t
    INNER JOIN memberships m ON t.id = m.thread
    WHERE t.type = ${threadTypes.SIDEBAR}
      AND m.role >= 0
  `;
  const readCountUpdate = SQL`
    UPDATE threads t
    INNER JOIN (
      SELECT thread AS threadID, COUNT(*) AS count
      FROM messages
      WHERE type IN (${includedMessageTypes})
      GROUP BY thread
    ) c ON c.threadID = t.id
    SET t.replies_count = c.count 
    WHERE t.type = ${threadTypes.SIDEBAR}
  `;
  const [[sidebarMembers]] = await Promise.all([
    dbQuery(sidebarMembersQuery),
    dbQuery(readCountUpdate),
  ]);

  const time = Date.now();
  const updates = sidebarMembers.map(({ threadID, userID }) => ({
    userID,
    time,
    threadID,
    type: updateTypes.UPDATE_THREAD,
  }));
  await createUpdates(updates);
}

main([computeRepliesCount]);
