// @flow

import { messageTypes } from 'lib/types/message-types-enum.js';
import { threadPermissions } from 'lib/types/thread-types.js';

import { endScript } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function main() {
  try {
    await createLastMessageColumn();
    await setLastReadMessage();
  } catch (e) {
    console.warn(e);
  } finally {
    endScript();
  }
}

async function createLastMessageColumn() {
  try {
    return await dbQuery(SQL`
      ALTER TABLE memberships 
      ADD last_read_message bigint(20) NOT NULL DEFAULT 0,
      ADD last_message bigint(20) NOT NULL DEFAULT 0
    `);
  } catch (e) {
    console.info('Column probably exists', e);
  }
}

async function setLastReadMessage() {
  const knowOfExtractString = `$.${threadPermissions.KNOW_OF}.value`;
  const [result] = await dbQuery(SQL`
    SELECT MAX(msg.id) AS message, msg.thread, stm.user
    FROM messages msg
    LEFT JOIN memberships stm ON msg.type = ${messageTypes.CREATE_SUB_THREAD}
      AND stm.thread = msg.content
    WHERE msg.type != ${messageTypes.CREATE_SUB_THREAD} OR
      JSON_EXTRACT(stm.permissions, ${knowOfExtractString}) IS TRUE
    GROUP BY msg.thread, stm.user
  `);

  const lastMessages = [];
  const userSpecificLastMessages = [];

  for (const row of result) {
    if (row.user) {
      userSpecificLastMessages.push({
        message: row.message,
        thread: row.thread,
        user: row.user,
      });
    } else {
      lastMessages.push({
        message: row.message,
        thread: row.thread,
      });
    }
  }

  if (lastMessages.length > 0) {
    const lastMessageExpression = SQL`last_message = CASE `;
    const lastReadMessageExpression = SQL`last_read_message = CASE `;
    for (const entry of lastMessages) {
      lastMessageExpression.append(SQL`
        WHEN thread = ${entry.thread} THEN ${entry.message}
      `);
      lastReadMessageExpression.append(SQL`
        WHEN thread = ${entry.thread} AND unread = 0 THEN ${entry.message}
      `);
    }
    lastMessageExpression.append(SQL`
      ELSE last_message
      END,
    `);
    lastReadMessageExpression.append(SQL`
      ELSE last_read_message
      END
    `);

    const query = SQL`
      UPDATE memberships
      SET
    `;
    query.append(lastMessageExpression);
    query.append(lastReadMessageExpression);
    await dbQuery(query);
  }

  if (userSpecificLastMessages.length > 0) {
    const lastMessageExpression = SQL`
      last_message = GREATEST(last_message, CASE 
    `;
    const lastReadMessageExpression = SQL`
      last_read_message = GREATEST(last_read_message, CASE 
    `;
    for (const entry of userSpecificLastMessages) {
      lastMessageExpression.append(SQL`
        WHEN thread = ${entry.thread} AND
          user = ${entry.user}
        THEN ${entry.message}
      `);
      lastReadMessageExpression.append(SQL`
        WHEN thread = ${entry.thread} AND 
          unread = 0 AND
          user = ${entry.user} 
        THEN ${entry.message}
      `);
    }
    lastMessageExpression.append(SQL`
      ELSE last_message
      END),
    `);
    lastReadMessageExpression.append(SQL`
      ELSE last_read_message
      END)
    `);

    const query = SQL`
      UPDATE memberships
      SET
    `;
    query.append(lastMessageExpression);
    query.append(lastReadMessageExpression);
    await dbQuery(query);
  }
}

main();
