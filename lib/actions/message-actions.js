// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type {
  MessageInfo,
  MessageTruncationStatus,
} from '../types/message-types';

import { numberPerThread } from '../reducers/message-reducer';

// For when you scroll up to load more messages
export type PageMessagesResult = {
  messageInfos: MessageInfo[],
  threadID: string,
  truncationStatus: MessageTruncationStatus,
};

// Used for the message info included in log-in type actions and pings
export type GenericMessagesResult = {
  messageInfos: MessageInfo[],
  truncationStatus: {[threadID: string]: MessageTruncationStatus},
  serverTime: number,
};

const fetchMessagesActionType = "FETCH_MESSAGES";
async function fetchMessages(
  fetchJSON: FetchJSON,
  threadID: string,
  beforeMessageID: string,
): Promise<PageMessagesResult> {
  const response = await fetchJSON('fetch_messages.php', {
    'input': {
      [threadID]: beforeMessageID,
    },
    'number_per_thread': numberPerThread,
  });
  return {
    threadID,
    messageInfos: response.message_infos,
    truncationStatus: response.truncation_status[threadID],
  };
}

export {
  fetchMessagesActionType,
  fetchMessages,
};
