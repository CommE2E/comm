// @flow

import natural from 'natural';

import type { RawMessageInfo } from 'lib/types/message-types';
import { messageTypes } from 'lib/types/message-types.js';

import { dbQuery, SQL } from '../database/database.js';
import { getSegmenter } from '../utils/segmenter.js';

const whiteSpacesRegex = /^[\s]*$/;
const punctuationRegex: RegExp = /\p{General_Category=Punctuation}/gu;

const segmenter = getSegmenter();
const { stopwords } = natural;

function segmentAndStem(message: string): string {
  const segmentsIterator = segmenter.segment(message.toLowerCase());

  const stemmedSegments = [];
  for (const segmentObj of segmentsIterator) {
    const { segment } = segmentObj;
    if (segment.match(whiteSpacesRegex) || stopwords.indexOf(segment) !== -1) {
      continue;
    }
    const stemmedSegment = natural.PorterStemmer.stem(segment).replaceAll(
      punctuationRegex,
      '',
    );
    stemmedSegments.push(stemmedSegment);
  }

  return stemmedSegments
    .filter(segment => !segment.match(whiteSpacesRegex))
    .join(' ');
}

async function processMessagesForSearch(
  messages: $ReadOnlyArray<RawMessageInfo | ProcessedForSearchRow>,
): Promise<void> {
  const processedMessages = [];

  for (const msg of messages) {
    if (
      msg.type !== messageTypes.TEXT &&
      msg.type !== messageTypes.EDIT_MESSAGE
    ) {
      continue;
    }

    const processedMessage = segmentAndStem(msg.text);

    if (msg.type === messageTypes.TEXT) {
      processedMessages.push([msg.id, msg.id, processedMessage]);
    } else {
      processedMessages.push([msg.targetMessageID, msg.id, processedMessage]);
    }
  }

  if (processedMessages.length === 0) {
    return;
  }

  await dbQuery(SQL`
    INSERT INTO message_search (original_message_id, message_id, processed_content)
    VALUES ${processedMessages}
    ON DUPLICATE KEY UPDATE
      message_id = VALUE(message_id),
      processed_content = VALUE(processed_content);
  `);
}

type ProcessedForSearchRowText = {
  +type: 0,
  +id: string,
  +text: string,
};
type ProcessedForSearchRowEdit = {
  +type: 20,
  +id: string,
  +targetMessageID: string,
  +text: string,
};
type ProcessedForSearchRow =
  | ProcessedForSearchRowText
  | ProcessedForSearchRowEdit;

function processRowsForSearch(
  rows: $ReadOnlyArray<any>,
): $ReadOnlyArray<ProcessedForSearchRow> {
  const results = [];
  for (const row of rows) {
    if (row.type === messageTypes.TEXT) {
      results.push({ type: row.type, id: row.id, text: row.content });
    } else if (row.type === messageTypes.EDIT_MESSAGE) {
      results.push({
        type: row.type,
        id: row.id,
        targetMessageID: row.target_message,
        text: row.content,
      });
    }
  }
  return results;
}

const pageSize = 1000;

async function processMessagesInDBForSearch(): Promise<void> {
  let lastID = 0;

  while (true) {
    const [messages] = await dbQuery(SQL`
      SELECT id, type, content, target_message
      FROM messages
      WHERE (type = ${messageTypes.TEXT} OR type = ${messageTypes.EDIT_MESSAGE})
        AND id > ${lastID}
      ORDER BY id
      LIMIT ${pageSize}
    `);

    if (messages.length === 0) {
      break;
    }

    const processedRows = processRowsForSearch(messages);

    await processMessagesForSearch(processedRows);

    if (messages.length < pageSize) {
      break;
    }
    lastID = messages[messages.length - 1].id;
  }
}

export {
  processMessagesForSearch,
  processMessagesInDBForSearch,
  segmentAndStem,
  stopwords,
};
