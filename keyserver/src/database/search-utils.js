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

export { processMessagesForSearch, segmentAndStem, stopwords };
