// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type {
  FetchMessageInfosPayload,
  SendMessageResult,
} from '../types/message-types';

const fetchMessagesBeforeCursorActionTypes = Object.freeze({
  started: 'FETCH_MESSAGES_BEFORE_CURSOR_STARTED',
  success: 'FETCH_MESSAGES_BEFORE_CURSOR_SUCCESS',
  failed: 'FETCH_MESSAGES_BEFORE_CURSOR_FAILED',
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
  };
}

const fetchMostRecentMessagesActionTypes = Object.freeze({
  started: 'FETCH_MOST_RECENT_MESSAGES_STARTED',
  success: 'FETCH_MOST_RECENT_MESSAGES_SUCCESS',
  failed: 'FETCH_MOST_RECENT_MESSAGES_FAILED',
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
  };
}

const sendTextMessageActionTypes = Object.freeze({
  started: 'SEND_TEXT_MESSAGE_STARTED',
  success: 'SEND_TEXT_MESSAGE_SUCCESS',
  failed: 'SEND_TEXT_MESSAGE_FAILED',
});
async function sendTextMessage(
  fetchJSON: FetchJSON,
  threadID: string,
  localID: string,
  text: string,
): Promise<SendMessageResult> {
  const response = await fetchJSON('create_text_message', {
    threadID,
    localID,
    text,
  });
  return {
    id: response.newMessageInfo.id,
    time: response.newMessageInfo.time,
  };
}

const createLocalMessageActionType = 'CREATE_LOCAL_MESSAGE';

const sendMultimediaMessageActionTypes = Object.freeze({
  started: 'SEND_MULTIMEDIA_MESSAGE_STARTED',
  success: 'SEND_MULTIMEDIA_MESSAGE_SUCCESS',
  failed: 'SEND_MULTIMEDIA_MESSAGE_FAILED',
});
async function sendMultimediaMessage(
  fetchJSON: FetchJSON,
  threadID: string,
  localID: string,
  mediaIDs: $ReadOnlyArray<string>,
): Promise<SendMessageResult> {
  const response = await fetchJSON('create_multimedia_message', {
    threadID,
    localID,
    mediaIDs,
  });
  return {
    id: response.newMessageInfo.id,
    time: response.newMessageInfo.time,
  };
}

const saveMessagesActionType = 'SAVE_MESSAGES';
const processMessagesActionType = 'PROCESS_MESSAGES';
const messageStorePruneActionType = 'MESSAGE_STORE_PRUNE';

export {
  fetchMessagesBeforeCursorActionTypes,
  fetchMessagesBeforeCursor,
  fetchMostRecentMessagesActionTypes,
  fetchMostRecentMessages,
  sendTextMessageActionTypes,
  sendTextMessage,
  createLocalMessageActionType,
  sendMultimediaMessageActionTypes,
  sendMultimediaMessage,
  saveMessagesActionType,
  processMessagesActionType,
  messageStorePruneActionType,
};
