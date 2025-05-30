// @flow

import type { MediaMessageServerDBContent } from '../types/messages/media.js';

const fetchMessagesBeforeCursorActionTypes = Object.freeze({
  started: 'FETCH_MESSAGES_BEFORE_CURSOR_STARTED',
  success: 'FETCH_MESSAGES_BEFORE_CURSOR_SUCCESS',
  failed: 'FETCH_MESSAGES_BEFORE_CURSOR_FAILED',
});
export type FetchMessagesBeforeCursorInput = {
  +threadID: string,
  +beforeMessageID: string,
  +numMessagesToFetch?: ?number,
};

export type FetchMostRecentMessagesInput = {
  +threadID: string,
  +numMessagesToFetch?: ?number,
};

const fetchMostRecentMessagesActionTypes = Object.freeze({
  started: 'FETCH_MOST_RECENT_MESSAGES_STARTED',
  success: 'FETCH_MOST_RECENT_MESSAGES_SUCCESS',
  failed: 'FETCH_MOST_RECENT_MESSAGES_FAILED',
});

const fetchSingleMostRecentMessagesFromThreadsActionTypes = Object.freeze({
  started: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_STARTED',
  success: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_SUCCESS',
  failed: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_FAILED',
});

export type SendTextMessageInput = {
  +threadID: string,
  +localID: string,
  +text: string,
  +sidebarCreation?: boolean,
};

const sendTextMessageActionTypes = Object.freeze({
  started: 'SEND_TEXT_MESSAGE_STARTED',
  success: 'SEND_TEXT_MESSAGE_SUCCESS',
  failed: 'SEND_TEXT_MESSAGE_FAILED',
});

const createLocalMessageActionType = 'CREATE_LOCAL_MESSAGE' as const;

export type SendMultimediaMessageInput = {
  +threadID: string,
  +localID: string,
  +mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent>,
  +sidebarCreation?: boolean,
};

const sendMultimediaMessageActionTypes = Object.freeze({
  started: 'SEND_MULTIMEDIA_MESSAGE_STARTED',
  success: 'SEND_MULTIMEDIA_MESSAGE_SUCCESS',
  failed: 'SEND_MULTIMEDIA_MESSAGE_FAILED',
});

export type LegacySendMultimediaMessageInput = {
  +threadID: string,
  +localID: string,
  +mediaIDs: $ReadOnlyArray<string>,
  +sidebarCreation?: boolean,
};

const sendReactionMessageActionTypes = Object.freeze({
  started: 'SEND_REACTION_MESSAGE_STARTED',
  success: 'SEND_REACTION_MESSAGE_SUCCESS',
  failed: 'SEND_REACTION_MESSAGE_FAILED',
});

const sendEditMessageActionTypes = Object.freeze({
  started: 'SEND_EDIT_MESSAGE_STARTED',
  success: 'SEND_EDIT_MESSAGE_SUCCESS',
  failed: 'SEND_EDIT_MESSAGE_FAILED',
});

const saveMessagesActionType = 'SAVE_MESSAGES' as const;
const processMessagesActionType = 'PROCESS_MESSAGES' as const;
const messageStorePruneActionType = 'MESSAGE_STORE_PRUNE' as const;

const fetchPinnedMessageActionTypes = Object.freeze({
  started: 'FETCH_PINNED_MESSAGES_STARTED',
  success: 'FETCH_PINNED_MESSAGES_SUCCESS',
  failed: 'FETCH_PINNED_MESSAGES_FAILED',
});

const searchMessagesActionTypes = Object.freeze({
  started: 'SEARCH_MESSAGES_STARTED',
  success: 'SEARCH_MESSAGES_SUCCESS',
  failed: 'SEARCH_MESSAGES_FAILED',
});

const toggleMessagePinActionTypes = Object.freeze({
  started: 'TOGGLE_MESSAGE_PIN_STARTED',
  success: 'TOGGLE_MESSAGE_PIN_SUCCESS',
  failed: 'TOGGLE_MESSAGE_PIN_FAILED',
});

const sendDeleteMessageActionTypes = Object.freeze({
  started: 'SEND_DELETE_MESSAGE_STARTED',
  success: 'SEND_DELETE_MESSAGE_SUCCESS',
  failed: 'SEND_DELETE_MESSAGE_FAILED',
});

export {
  fetchMessagesBeforeCursorActionTypes,
  fetchMostRecentMessagesActionTypes,
  fetchSingleMostRecentMessagesFromThreadsActionTypes,
  sendTextMessageActionTypes,
  createLocalMessageActionType,
  sendMultimediaMessageActionTypes,
  searchMessagesActionTypes,
  sendReactionMessageActionTypes,
  saveMessagesActionType,
  processMessagesActionType,
  messageStorePruneActionType,
  sendEditMessageActionTypes,
  fetchPinnedMessageActionTypes,
  toggleMessagePinActionTypes,
  sendDeleteMessageActionTypes,
};
