// @flow

import invariant from 'invariant';

import type {
  FetchMessageInfosPayload,
  SendMessageResult,
  SendEditMessageResult,
  SendReactionMessageRequest,
  SimpleMessagesPayload,
  SendEditMessageRequest,
  FetchPinnedMessagesRequest,
  FetchPinnedMessagesResult,
} from '../types/message-types.js';
import type { MediaMessageServerDBContent } from '../types/messages/media.js';
import type {
  CallServerEndpoint,
  CallServerEndpointResultInfo,
} from '../utils/call-server-endpoint.js';

const fetchMessagesBeforeCursorActionTypes = Object.freeze({
  started: 'FETCH_MESSAGES_BEFORE_CURSOR_STARTED',
  success: 'FETCH_MESSAGES_BEFORE_CURSOR_SUCCESS',
  failed: 'FETCH_MESSAGES_BEFORE_CURSOR_FAILED',
});
const fetchMessagesBeforeCursor =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    threadID: string,
    beforeMessageID: string,
  ) => Promise<FetchMessageInfosPayload>) =>
  async (threadID, beforeMessageID) => {
    const response = await callServerEndpoint('fetch_messages', {
      cursors: {
        [threadID]: beforeMessageID,
      },
    });
    return {
      threadID,
      rawMessageInfos: response.rawMessageInfos,
      truncationStatus: response.truncationStatuses[threadID],
    };
  };

const fetchMostRecentMessagesActionTypes = Object.freeze({
  started: 'FETCH_MOST_RECENT_MESSAGES_STARTED',
  success: 'FETCH_MOST_RECENT_MESSAGES_SUCCESS',
  failed: 'FETCH_MOST_RECENT_MESSAGES_FAILED',
});
const fetchMostRecentMessages =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((threadID: string) => Promise<FetchMessageInfosPayload>) =>
  async threadID => {
    const response = await callServerEndpoint('fetch_messages', {
      cursors: {
        [threadID]: null,
      },
    });
    return {
      threadID,
      rawMessageInfos: response.rawMessageInfos,
      truncationStatus: response.truncationStatuses[threadID],
    };
  };

const fetchSingleMostRecentMessagesFromThreadsActionTypes = Object.freeze({
  started: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_STARTED',
  success: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_SUCCESS',
  failed: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_FAILED',
});
const fetchSingleMostRecentMessagesFromThreads =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((threadIDs: $ReadOnlyArray<string>) => Promise<SimpleMessagesPayload>) =>
  async threadIDs => {
    const cursors = Object.fromEntries(
      threadIDs.map(threadID => [threadID, null]),
    );
    const response = await callServerEndpoint('fetch_messages', {
      cursors,
      numberPerThread: 1,
    });
    return {
      rawMessageInfos: response.rawMessageInfos,
      truncationStatuses: response.truncationStatuses,
    };
  };

const sendTextMessageActionTypes = Object.freeze({
  started: 'SEND_TEXT_MESSAGE_STARTED',
  success: 'SEND_TEXT_MESSAGE_SUCCESS',
  failed: 'SEND_TEXT_MESSAGE_FAILED',
});
const sendTextMessage =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    threadID: string,
    localID: string,
    text: string,
    sidebarCreation?: boolean,
  ) => Promise<SendMessageResult>) =>
  async (threadID, localID, text, sidebarCreation) => {
    let resultInfo;
    const getResultInfo = (passedResultInfo: CallServerEndpointResultInfo) => {
      resultInfo = passedResultInfo;
    };
    let payload = { threadID, localID, text };
    if (sidebarCreation) {
      payload = { ...payload, sidebarCreation };
    }
    const response = await callServerEndpoint('create_text_message', payload, {
      getResultInfo,
    });
    const resultInterface = resultInfo?.interface;
    invariant(
      resultInterface,
      'getResultInfo not called before callServerEndpoint resolves',
    );
    return {
      id: response.newMessageInfo.id,
      time: response.newMessageInfo.time,
      interface: resultInterface,
    };
  };

const createLocalMessageActionType = 'CREATE_LOCAL_MESSAGE';

const sendMultimediaMessageActionTypes = Object.freeze({
  started: 'SEND_MULTIMEDIA_MESSAGE_STARTED',
  success: 'SEND_MULTIMEDIA_MESSAGE_SUCCESS',
  failed: 'SEND_MULTIMEDIA_MESSAGE_FAILED',
});
const sendMultimediaMessage =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    threadID: string,
    localID: string,
    mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent>,
    sidebarCreation?: boolean,
  ) => Promise<SendMessageResult>) =>
  async (threadID, localID, mediaMessageContents, sidebarCreation) => {
    let resultInfo;
    const getResultInfo = (passedResultInfo: CallServerEndpointResultInfo) => {
      resultInfo = passedResultInfo;
    };
    let payload = { threadID, localID, mediaMessageContents };
    if (sidebarCreation) {
      payload = { ...payload, sidebarCreation };
    }
    const response = await callServerEndpoint(
      'create_multimedia_message',
      payload,
      { getResultInfo },
    );
    const resultInterface = resultInfo?.interface;
    invariant(
      resultInterface,
      'getResultInfo not called before callServerEndpoint resolves',
    );
    return {
      id: response.newMessageInfo.id,
      time: response.newMessageInfo.time,
      interface: resultInterface,
    };
  };

const legacySendMultimediaMessage =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    threadID: string,
    localID: string,
    mediaIDs: $ReadOnlyArray<string>,
    sidebarCreation?: boolean,
  ) => Promise<SendMessageResult>) =>
  async (threadID, localID, mediaIDs, sidebarCreation) => {
    let resultInfo;
    const getResultInfo = (passedResultInfo: CallServerEndpointResultInfo) => {
      resultInfo = passedResultInfo;
    };
    let payload = { threadID, localID, mediaIDs };
    if (sidebarCreation) {
      payload = { ...payload, sidebarCreation };
    }
    const response = await callServerEndpoint(
      'create_multimedia_message',
      payload,
      { getResultInfo },
    );
    const resultInterface = resultInfo?.interface;
    invariant(
      resultInterface,
      'getResultInfo not called before callServerEndpoint resolves',
    );
    return {
      id: response.newMessageInfo.id,
      time: response.newMessageInfo.time,
      interface: resultInterface,
    };
  };

const sendReactionMessageActionTypes = Object.freeze({
  started: 'SEND_REACTION_MESSAGE_STARTED',
  success: 'SEND_REACTION_MESSAGE_SUCCESS',
  failed: 'SEND_REACTION_MESSAGE_FAILED',
});
const sendReactionMessage =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((request: SendReactionMessageRequest) => Promise<SendMessageResult>) =>
  async request => {
    let resultInfo;
    const getResultInfo = (passedResultInfo: CallServerEndpointResultInfo) => {
      resultInfo = passedResultInfo;
    };

    const response = await callServerEndpoint(
      'create_reaction_message',
      {
        threadID: request.threadID,
        localID: request.localID,
        targetMessageID: request.targetMessageID,
        reaction: request.reaction,
        action: request.action,
      },
      { getResultInfo },
    );

    const resultInterface = resultInfo?.interface;
    invariant(
      resultInterface,
      'getResultInfo not called before callServerEndpoint resolves',
    );

    return {
      id: response.newMessageInfo.id,
      time: response.newMessageInfo.time,
      interface: resultInterface,
    };
  };

const sendEditMessageActionTypes = Object.freeze({
  started: 'SEND_EDIT_MESSAGE_STARTED',
  success: 'SEND_EDIT_MESSAGE_SUCCESS',
  failed: 'SEND_EDIT_MESSAGE_FAILED',
});
const sendEditMessage =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((request: SendEditMessageRequest) => Promise<SendEditMessageResult>) =>
  async request => {
    const response = await callServerEndpoint('edit_message', {
      targetMessageID: request.targetMessageID,
      text: request.text,
    });
    return {
      newMessageInfos: response.newMessageInfos,
    };
  };

const saveMessagesActionType = 'SAVE_MESSAGES';
const processMessagesActionType = 'PROCESS_MESSAGES';
const messageStorePruneActionType = 'MESSAGE_STORE_PRUNE';

const fetchPinnedMessages =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    request: FetchPinnedMessagesRequest,
  ) => Promise<FetchPinnedMessagesResult>) =>
  async request => {
    const response = await callServerEndpoint('fetch_pinned_messages', request);
    return { pinnedMessages: response.pinnedMessages };
  };

export {
  fetchMessagesBeforeCursorActionTypes,
  fetchMessagesBeforeCursor,
  fetchMostRecentMessagesActionTypes,
  fetchMostRecentMessages,
  fetchSingleMostRecentMessagesFromThreadsActionTypes,
  fetchSingleMostRecentMessagesFromThreads,
  sendTextMessageActionTypes,
  sendTextMessage,
  createLocalMessageActionType,
  sendMultimediaMessageActionTypes,
  sendMultimediaMessage,
  legacySendMultimediaMessage,
  sendReactionMessageActionTypes,
  sendReactionMessage,
  saveMessagesActionType,
  processMessagesActionType,
  messageStorePruneActionType,
  sendEditMessageActionTypes,
  sendEditMessage,
  fetchPinnedMessages,
};
