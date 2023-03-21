// @flow

import natural from 'natural';

import type { RawMessageInfo } from 'lib/types/message-types';
import { messageTypes } from 'lib/types/message-types.js';

import { dbQuery, SQL } from '../database/database.js';

async function processMessagesForSearch(
  messages: $ReadOnlyArray<RawMessageInfo>,
): Promise<void> {
  const processedMessages = [];

  for (const msg of messages) {
    if (
      msg.type !== messageTypes.TEXT &&
      msg.type !== messageTypes.EDIT_MESSAGE
    ) {
      continue;
    }

    const processed_msg = natural.PorterStemmer.tokenizeAndStem(
      msg.text,
      false,
    ).join(' ');

    if (msg.type === messageTypes.TEXT) {
      processedMessages.push([msg.id, msg.id, processed_msg]);
    } else {
      processedMessages.push([msg.targetMessageID, msg.id, processed_msg]);
    }
  }

  if (processedMessages.length === 0) {
    return;
  }

  await dbQuery(SQL`
    INSERT INTO search (original_message_id, message_id, processed_content)
    VALUES ${processedMessages}
    ON DUPLICATE KEY UPDATE 
      message_id = VALUE(message_id), 
      processed_content = VALUE(processed_content);
  `);
}

export { processMessagesForSearch };
