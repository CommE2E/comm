// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type {
  RawMessageInfo,
  MessageTruncationStatus,
} from '../types/message-types';
import type { UserInfo } from '../types/user-types';

import { numberPerThread } from '../reducers/message-reducer';

// Used for the message info included in log-in type actions and pings
export type GenericMessagesResult = {|
  messageInfos: RawMessageInfo[],
  truncationStatus: {[threadID: string]: MessageTruncationStatus},
  serverTime: number,
  watchedIDsAtRequestTime: $ReadOnlyArray<string>,
|};

// For when you scroll up to load more messages
export type PageMessagesResult = {|
  messageInfos: RawMessageInfo[],
  threadID: string,
  truncationStatus: MessageTruncationStatus,
  userInfos: UserInfo[],
|};
const fetchMessagesBeforeCursorActionTypes = {
  started: "FETCH_MESSAGES_BEFORE_CURSOR_STARTED",
  success: "FETCH_MESSAGES_BEFORE_CURSOR_SUCCESS",
  failed: "FETCH_MESSAGES_BEFORE_CURSOR_FAILED",
};
async function fetchMessagesBeforeCursor(
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
    userInfos: response.user_infos,
  };
}

export type SendMessageResult = {
  id: string,
  time: number,
};
const sendMessageActionTypes = {
  started: "SEND_MESSAGE_STARTED",
  success: "SEND_MESSAGE_SUCCESS",
  failed: "SEND_MESSAGE_FAILED",
};
async function sendMessage(
  fetchJSON: FetchJSON,
  threadID: string,
  text: string,
): Promise<SendMessageResult> {
  const response = await fetchJSON('send_message.php', {
    'thread': threadID,
    'text': text,
  });
  return {
    id: response.new_message_infos[0].id,
    time: response.new_message_infos[0].time,
  };
}

export {
  fetchMessagesBeforeCursorActionTypes,
  fetchMessagesBeforeCursor,
  sendMessageActionTypes,
  sendMessage,
};
