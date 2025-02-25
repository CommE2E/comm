// @flow

import * as React from 'react';

import {
  extractKeyserverIDFromIDOptional,
  extractKeyserverIDFromID,
  sortThreadIDsPerKeyserver,
} from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import type {
  FetchMessageInfosPayload,
  SendMessageResult,
  SendEditMessageResult,
  SendReactionMessageRequest,
  SimpleMessagesPayload,
  SendEditMessageRequest,
  FetchPinnedMessagesRequest,
  FetchPinnedMessagesResult,
  SearchMessagesRequest,
  SearchMessagesKeyserverRequest,
  SearchMessagesResponse,
  FetchMessageInfosRequest,
  RawMessageInfo,
  MessageTruncationStatuses,
} from '../types/message-types.js';
import { defaultNumberPerThread } from '../types/message-types.js';
import type { MediaMessageServerDBContent } from '../types/messages/media.js';
import type {
  ToggleMessagePinRequest,
  ToggleMessagePinResult,
} from '../types/thread-types.js';
import { getConfig } from '../utils/config.js';
import { translateClientDBMessageInfoToRawMessageInfo } from '../utils/message-ops-utils.js';

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
const fetchMessagesBeforeCursor =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: FetchMessagesBeforeCursorInput,
  ) => Promise<FetchMessageInfosPayload>) =>
  async input => {
    const { threadID, beforeMessageID } = input;

    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = {
      [keyserverID]: {
        cursors: {
          [threadID]: beforeMessageID,
        },
      },
    };

    if (input.numMessagesToFetch) {
      requests[keyserverID].numberPerThread = input.numMessagesToFetch;
    }

    const responses = await callKeyserverEndpoint('fetch_messages', requests);
    return {
      threadID,
      rawMessageInfos: responses[keyserverID].rawMessageInfos,
      truncationStatus: responses[keyserverID].truncationStatuses[threadID],
    };
  };

function useFetchMessagesBeforeCursor(): (
  input: FetchMessagesBeforeCursorInput,
) => Promise<FetchMessageInfosPayload> {
  return useKeyserverCall(fetchMessagesBeforeCursor);
}

export type FetchMostRecentMessagesInput = {
  +threadID: string,
  +numMessagesToFetch?: ?number,
};

const fetchMostRecentMessagesActionTypes = Object.freeze({
  started: 'FETCH_MOST_RECENT_MESSAGES_STARTED',
  success: 'FETCH_MOST_RECENT_MESSAGES_SUCCESS',
  failed: 'FETCH_MOST_RECENT_MESSAGES_FAILED',
});
const fetchMostRecentMessages =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: FetchMostRecentMessagesInput,
  ) => Promise<FetchMessageInfosPayload>) =>
  async input => {
    const { threadID } = input;

    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = {
      [keyserverID]: {
        cursors: {
          [threadID]: null,
        },
      },
    };

    if (input.numMessagesToFetch) {
      requests[keyserverID].numberPerThread = input.numMessagesToFetch;
    }

    const responses = await callKeyserverEndpoint('fetch_messages', requests);
    return {
      threadID,
      rawMessageInfos: responses[keyserverID].rawMessageInfos,
      truncationStatus: responses[keyserverID].truncationStatuses[threadID],
    };
  };

function useFetchMostRecentMessages(): (
  input: FetchMostRecentMessagesInput,
) => Promise<FetchMessageInfosPayload> {
  return useKeyserverCall(fetchMostRecentMessages);
}

const fetchSingleMostRecentMessagesFromThreadsActionTypes = Object.freeze({
  started: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_STARTED',
  success: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_SUCCESS',
  failed: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_FAILED',
});
const fetchSingleMostRecentMessagesFromThreads =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((threadIDs: $ReadOnlyArray<string>) => Promise<SimpleMessagesPayload>) =>
  async threadIDs => {
    const sortedThreadIDs = sortThreadIDsPerKeyserver(threadIDs);

    const requests: { [string]: FetchMessageInfosRequest } = {};
    for (const keyserverID in sortedThreadIDs) {
      const cursors = Object.fromEntries(
        sortedThreadIDs[keyserverID].map(threadID => [threadID, null]),
      );
      requests[keyserverID] = {
        cursors,
        numberPerThread: 1,
      };
    }

    const responses = await callKeyserverEndpoint('fetch_messages', requests);
    let rawMessageInfos: $ReadOnlyArray<RawMessageInfo> = [];
    let truncationStatuses: MessageTruncationStatuses = {};
    for (const keyserverID in responses) {
      rawMessageInfos = rawMessageInfos.concat(
        responses[keyserverID].rawMessageInfos,
      );
      truncationStatuses = {
        ...truncationStatuses,
        ...responses[keyserverID].truncationStatuses,
      };
    }

    return {
      rawMessageInfos,
      truncationStatuses,
    };
  };

function useFetchSingleMostRecentMessagesFromThreads(): (
  threadIDs: $ReadOnlyArray<string>,
) => Promise<SimpleMessagesPayload> {
  return useKeyserverCall(fetchSingleMostRecentMessagesFromThreads);
}

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
const sendTextMessage =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: SendTextMessageInput) => Promise<SendMessageResult>) =>
  async input => {
    const { threadID, localID, text, sidebarCreation } = input;
    let payload = { threadID, localID, text };
    if (sidebarCreation) {
      payload = { ...payload, sidebarCreation };
    }

    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: payload };

    const responses = await callKeyserverEndpoint(
      'create_text_message',
      requests,
    );
    return {
      id: responses[keyserverID].newMessageInfo.id,
      time: responses[keyserverID].newMessageInfo.time,
    };
  };

function useSendTextMessage(): (
  input: SendTextMessageInput,
) => Promise<SendMessageResult> {
  return useKeyserverCall(sendTextMessage);
}

const createLocalMessageActionType = 'CREATE_LOCAL_MESSAGE';

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
const sendMultimediaMessage =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: SendMultimediaMessageInput) => Promise<SendMessageResult>) =>
  async input => {
    const { threadID, localID, mediaMessageContents, sidebarCreation } = input;
    let payload = { threadID, localID, mediaMessageContents };
    if (sidebarCreation) {
      payload = { ...payload, sidebarCreation };
    }

    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: payload };

    const responses = await callKeyserverEndpoint(
      'create_multimedia_message',
      requests,
    );
    return {
      id: responses[keyserverID].newMessageInfo.id,
      time: responses[keyserverID].newMessageInfo.time,
    };
  };

function useSendMultimediaMessage(): (
  input: SendMultimediaMessageInput,
) => Promise<SendMessageResult> {
  return useKeyserverCall(sendMultimediaMessage);
}

export type LegacySendMultimediaMessageInput = {
  +threadID: string,
  +localID: string,
  +mediaIDs: $ReadOnlyArray<string>,
  +sidebarCreation?: boolean,
};

const legacySendMultimediaMessage =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: LegacySendMultimediaMessageInput,
  ) => Promise<SendMessageResult>) =>
  async input => {
    const { threadID, localID, mediaIDs, sidebarCreation } = input;
    let payload = { threadID, localID, mediaIDs };
    if (sidebarCreation) {
      payload = { ...payload, sidebarCreation };
    }

    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: payload };

    const responses = await callKeyserverEndpoint(
      'create_multimedia_message',
      requests,
    );
    return {
      id: responses[keyserverID].newMessageInfo.id,
      time: responses[keyserverID].newMessageInfo.time,
    };
  };

function useLegacySendMultimediaMessage(): (
  input: LegacySendMultimediaMessageInput,
) => Promise<SendMessageResult> {
  return useKeyserverCall(legacySendMultimediaMessage);
}

const sendReactionMessageActionTypes = Object.freeze({
  started: 'SEND_REACTION_MESSAGE_STARTED',
  success: 'SEND_REACTION_MESSAGE_SUCCESS',
  failed: 'SEND_REACTION_MESSAGE_FAILED',
});
const sendReactionMessage =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: SendReactionMessageRequest) => Promise<SendMessageResult>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = {
      [keyserverID]: {
        threadID: input.threadID,
        localID: input.localID,
        targetMessageID: input.targetMessageID,
        reaction: input.reaction,
        action: input.action,
      },
    };

    const responses = await callKeyserverEndpoint(
      'create_reaction_message',
      requests,
    );
    return {
      id: responses[keyserverID].newMessageInfo.id,
      time: responses[keyserverID].newMessageInfo.time,
    };
  };

function useSendReactionMessage(): (
  input: SendReactionMessageRequest,
) => Promise<SendMessageResult> {
  return useKeyserverCall(sendReactionMessage);
}

const sendEditMessageActionTypes = Object.freeze({
  started: 'SEND_EDIT_MESSAGE_STARTED',
  success: 'SEND_EDIT_MESSAGE_SUCCESS',
  failed: 'SEND_EDIT_MESSAGE_FAILED',
});
const sendEditMessage =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: SendEditMessageRequest) => Promise<SendEditMessageResult>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.targetMessageID);
    const requests = {
      [keyserverID]: {
        targetMessageID: input.targetMessageID,
        text: input.text,
      },
    };

    const responses = await callKeyserverEndpoint('edit_message', requests);

    return {
      newMessageInfos: responses[keyserverID].newMessageInfos,
    };
  };

function useSendEditMessage(): (
  input: SendEditMessageRequest,
) => Promise<SendEditMessageResult> {
  return useKeyserverCall(sendEditMessage);
}

const saveMessagesActionType = 'SAVE_MESSAGES';
const processMessagesActionType = 'PROCESS_MESSAGES';
const messageStorePruneActionType = 'MESSAGE_STORE_PRUNE';

const fetchPinnedMessageActionTypes = Object.freeze({
  started: 'FETCH_PINNED_MESSAGES_STARTED',
  success: 'FETCH_PINNED_MESSAGES_SUCCESS',
  failed: 'FETCH_PINNED_MESSAGES_FAILED',
});
const fetchPinnedMessages =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: FetchPinnedMessagesRequest,
  ) => Promise<FetchPinnedMessagesResult>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'fetch_pinned_messages',
      requests,
    );

    return { pinnedMessages: responses[keyserverID].pinnedMessages };
  };

function useFetchPinnedMessages(): (
  input: FetchPinnedMessagesRequest,
) => Promise<FetchPinnedMessagesResult> {
  return useKeyserverCall(fetchPinnedMessages);
}

const searchMessagesActionTypes = Object.freeze({
  started: 'SEARCH_MESSAGES_STARTED',
  success: 'SEARCH_MESSAGES_SUCCESS',
  failed: 'SEARCH_MESSAGES_FAILED',
});

const searchMessages =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: SearchMessagesKeyserverRequest,
  ) => Promise<SearchMessagesResponse>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint('search_messages', requests);

    return {
      messages: responses[keyserverID].messages,
      endReached: responses[keyserverID].endReached,
    };
  };

function useSearchMessages(): (
  input: SearchMessagesRequest,
) => Promise<SearchMessagesResponse> {
  const thinThreadCallback = useKeyserverCall(searchMessages);
  return React.useCallback(
    async (input: SearchMessagesRequest) => {
      const isThreadThin = !!extractKeyserverIDFromIDOptional(input.threadID);

      if (isThreadThin) {
        return await thinThreadCallback({
          query: input.query,
          threadID: input.threadID,
          cursor: input.messageIDCursor,
        });
      }

      const { sqliteAPI } = getConfig();
      const timestampCursor = input.timestampCursor?.toString();
      const clientDBMessageInfos = await sqliteAPI.searchMessages(
        input.query,
        input.threadID,
        timestampCursor,
        input.messageIDCursor,
      );

      const messages = clientDBMessageInfos.map(
        translateClientDBMessageInfoToRawMessageInfo,
      );
      return {
        endReached: messages.length < defaultNumberPerThread,
        messages,
      };
    },
    [thinThreadCallback],
  );
}

const toggleMessagePinActionTypes = Object.freeze({
  started: 'TOGGLE_MESSAGE_PIN_STARTED',
  success: 'TOGGLE_MESSAGE_PIN_SUCCESS',
  failed: 'TOGGLE_MESSAGE_PIN_FAILED',
});
const toggleMessagePin =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: ToggleMessagePinRequest) => Promise<ToggleMessagePinResult>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.messageID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'toggle_message_pin',
      requests,
    );
    const response = responses[keyserverID];
    return {
      newMessageInfos: response.newMessageInfos,
      threadID: response.threadID,
    };
  };

function useToggleMessagePin(): (
  input: ToggleMessagePinRequest,
) => Promise<ToggleMessagePinResult> {
  return useKeyserverCall(toggleMessagePin);
}

export {
  fetchMessagesBeforeCursorActionTypes,
  useFetchMessagesBeforeCursor,
  fetchMostRecentMessagesActionTypes,
  useFetchMostRecentMessages,
  fetchSingleMostRecentMessagesFromThreadsActionTypes,
  useFetchSingleMostRecentMessagesFromThreads,
  sendTextMessageActionTypes,
  useSendTextMessage,
  createLocalMessageActionType,
  sendMultimediaMessageActionTypes,
  useSendMultimediaMessage,
  useLegacySendMultimediaMessage,
  searchMessagesActionTypes,
  useSearchMessages,
  sendReactionMessageActionTypes,
  useSendReactionMessage,
  saveMessagesActionType,
  processMessagesActionType,
  messageStorePruneActionType,
  sendEditMessageActionTypes,
  useSendEditMessage,
  useFetchPinnedMessages,
  fetchPinnedMessageActionTypes,
  toggleMessagePinActionTypes,
  useToggleMessagePin,
};
