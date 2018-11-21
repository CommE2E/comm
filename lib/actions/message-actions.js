// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type {
  RawMessageInfo,
  MessageTruncationStatus,
  FetchMessageInfosPayload,
  SendTextMessageResult,
} from '../types/message-types';
import type { UserInfo } from '../types/user-types';

import { values } from '../utils/objects';

const fetchMessagesBeforeCursorActionTypes = Object.freeze({
  started: "FETCH_MESSAGES_BEFORE_CURSOR_STARTED",
  success: "FETCH_MESSAGES_BEFORE_CURSOR_SUCCESS",
  failed: "FETCH_MESSAGES_BEFORE_CURSOR_FAILED",
});
async function fetchMessagesBeforeCursor(
  fetchJSON: FetchJSON,
  threadID: string,
  beforeMessageID: string,
): Promise<FetchMessageInfosPayload> {
  const response = await fetchJSON('fetch_messages', {
    cursors: {
      [threadID]: beforeMessageID,
    },
  });
  return {
    threadID,
    rawMessageInfos: response.rawMessageInfos,
    truncationStatus: response.truncationStatuses[threadID],
    userInfos: values(response.userInfos),
  };
}

const fetchMostRecentMessagesActionTypes = Object.freeze({
  started: "FETCH_MOST_RECENT_MESSAGES_STARTED",
  success: "FETCH_MOST_RECENT_MESSAGES_SUCCESS",
  failed: "FETCH_MOST_RECENT_MESSAGES_FAILED",
});
async function fetchMostRecentMessages(
  fetchJSON: FetchJSON,
  threadID: string,
): Promise<FetchMessageInfosPayload> {
  const response = await fetchJSON('fetch_messages', {
    cursors: {
      [threadID]: null,
    },
  });
  return {
    threadID,
    rawMessageInfos: response.rawMessageInfos,
    truncationStatus: response.truncationStatuses[threadID],
    userInfos: values(response.userInfos),
  };
}

const sendMessageActionTypes = Object.freeze({
  started: "SEND_MESSAGE_STARTED",
  success: "SEND_MESSAGE_SUCCESS",
  failed: "SEND_MESSAGE_FAILED",
});
async function sendMessage(
  fetchJSON: FetchJSON,
  threadID: string,
  localID: string,
  text: string,
): Promise<SendTextMessageResult> {
  const response = await fetchJSON(
    'create_text_message',
    { threadID, localID, text },
  );
  return {
    id: response.newMessageInfo.id,
    time: response.newMessageInfo.time,
  };
}

const saveMessagesActionType = "SAVE_MESSAGES";

export {
  fetchMessagesBeforeCursorActionTypes,
  fetchMessagesBeforeCursor,
  fetchMostRecentMessagesActionTypes,
  fetchMostRecentMessages,
  sendMessageActionTypes,
  sendMessage,
  saveMessagesActionType,
};
