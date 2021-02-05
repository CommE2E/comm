// @flow

import { messageSpecs } from 'lib/shared/messages/message-specs';
import { messageTypes } from 'lib/types/message-types';
import { threadTypes } from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function computeRepliesCount() {
  const includedMessageTypes = Object.keys(messageTypes)
    .map((key) => messageTypes[key])
    .filter((type) => messageSpecs[type].includedInRepliesCount);

  const query = SQL`
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
  await dbQuery(query);
}

main([computeRepliesCount]);
