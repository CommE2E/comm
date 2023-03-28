// @flow

import natural from 'natural';

import type { RawMessageInfo } from 'lib/types/message-types';
import { messageTypes } from 'lib/types/message-types.js';

import { dbQuery, SQL } from '../database/database.js';
import { getSegmenter } from '../utils/segmenter.js';

const whiteSpacesRegex = /^[\s]*$/;
const punctuationRegex = /[[\]!"#$%&'()*+,./:;<=>?@\\^_`{|}~-]+/g;

const segmenter = getSegmenter();
const stopwords = natural.stopwords;

function segmentAndStem(message: string): string {
  const segments = [...segmenter.segment(message.toLowerCase())].filter(
    ({ segment }) =>
      !segment.match(whiteSpacesRegex) && stopwords.indexOf(segment) === -1,
  );

  const stemmed_segments = [];
  for (const { segment } of segments) {
    const stemmed_segment = natural.PorterStemmer.stem(segment).replace(
      punctuationRegex,
      '',
    );
    stemmed_segments.push(stemmed_segment);
  }

  return stemmed_segments
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

    const processed_msg = segmentAndStem(msg.text);

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
    INSERT INTO message_search (original_message_id, message_id, processed_content)
    VALUES ${processedMessages}
    ON DUPLICATE KEY UPDATE 
      message_id = VALUE(message_id), 
      processed_content = VALUE(processed_content);
  `);
}

export { processMessagesForSearch, segmentAndStem, stopwords };
