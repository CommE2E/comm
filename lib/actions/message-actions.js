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
  SearchMessagesRequest,
  SearchMessagesResponse,
} from '../types/message-types.js';
import type { MediaMessageServerDBContent } from '../types/messages/media.js';
import type { CallServerEndpointResultInfo } from '../utils/call-server-endpoint.js';
import { useKeyserverCall } from '../utils/keyserver-call.js';
import type {
  CallKeyserverEndpoint,
  KeyserverCall,
} from '../utils/keyserver-call.js';
import {
  targetMessageKeyserverIDExtractor,
  threadIDKeyserverIDExtractor,
} from '../utils/keyserver-id-extractors.js';

const fetchMessagesBeforeCursorActionTypes = Object.freeze({
  started: 'FETCH_MESSAGES_BEFORE_CURSOR_STARTED',
  success: 'FETCH_MESSAGES_BEFORE_CURSOR_SUCCESS',
  failed: 'FETCH_MESSAGES_BEFORE_CURSOR_FAILED',
});
export type FetchMessagesBeforeCursorInput = {
  +threadID: string,
  +beforeMessageID: string,
};
const fetchMessagesBeforeCursorActionFunc =
  (
    callServerEndpoint: CallKeyserverEndpoint<FetchMessagesBeforeCursorInput>,
  ): ((
    input: FetchMessagesBeforeCursorInput,
  ) => Promise<FetchMessageInfosPayload>) =>
  async input => {
    const { threadID, beforeMessageID } = input;
    const response = await callServerEndpoint(
      'fetch_messages',
      {
        cursors: {
          [threadID]: beforeMessageID,
        },
      },
      input,
    );
    return {
      threadID,
      rawMessageInfos: response.rawMessageInfos,
      truncationStatus: response.truncationStatuses[threadID],
    };
  };

const fetchMessagesBeforeCursor: KeyserverCall<
  FetchMessagesBeforeCursorInput,
  FetchMessageInfosPayload,
> = {
  actionFunc: fetchMessagesBeforeCursorActionFunc,
  config: {
    keyserverSelection: 'specific',
    keyserverIDExtractor: threadIDKeyserverIDExtractor,
  },
};

function useFetchMessagesBeforeCursor(): (
  input: FetchMessagesBeforeCursorInput,
) => Promise<FetchMessageInfosPayload> {
  return useKeyserverCall(fetchMessagesBeforeCursor);
}

export type FetchMostRecentMessagesInput = {
  +threadID: string,
};

const fetchMostRecentMessagesActionTypes = Object.freeze({
  started: 'FETCH_MOST_RECENT_MESSAGES_STARTED',
  success: 'FETCH_MOST_RECENT_MESSAGES_SUCCESS',
  failed: 'FETCH_MOST_RECENT_MESSAGES_FAILED',
});
const fetchMostRecentMessagesActionFunc =
  (
    callServerEndpoint: CallKeyserverEndpoint<FetchMostRecentMessagesInput>,
  ): ((
    input: FetchMostRecentMessagesInput,
  ) => Promise<FetchMessageInfosPayload>) =>
  async input => {
    const { threadID } = input;
    const response = await callServerEndpoint(
      'fetch_messages',
      {
        cursors: {
          [threadID]: null,
        },
      },
      input,
    );
    return {
      threadID,
      rawMessageInfos: response.rawMessageInfos,
      truncationStatus: response.truncationStatuses[threadID],
    };
  };

const fetchMostRecentMessages: KeyserverCall<
  FetchMostRecentMessagesInput,
  FetchMessageInfosPayload,
> = {
  actionFunc: fetchMostRecentMessagesActionFunc,
  config: {
    keyserverSelection: 'specific',
    keyserverIDExtractor: threadIDKeyserverIDExtractor,
  },
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
const fetchSingleMostRecentMessagesFromThreadsActionFunc =
  (
    callServerEndpoint: CallKeyserverEndpoint<$ReadOnlyArray<string>>,
  ): ((threadIDs: $ReadOnlyArray<string>) => Promise<SimpleMessagesPayload>) =>
  async threadIDs => {
    const cursors = Object.fromEntries(
      threadIDs.map(threadID => [threadID, null]),
    );
    const responses = await callServerEndpoint(
      'fetch_messages',
      {
        cursors,
        numberPerThread: 1,
      },
      threadIDs,
    );
    let rawMessageInfos = [];
    let truncationStatuses = {};
    for (const response of responses) {
      rawMessageInfos = rawMessageInfos.concat(response.rawMessageInfos);
      truncationStatuses = {
        ...truncationStatuses,
        ...response.truncationStatuses,
      };
    }

    return {
      rawMessageInfos,
      truncationStatuses,
    };
  };

const fetchSingleMostRecentMessagesFromThreads: KeyserverCall<
  $ReadOnlyArray<string>,
  SimpleMessagesPayload,
> = {
  actionFunc: fetchSingleMostRecentMessagesFromThreadsActionFunc,
  config: {
    keyserverSelection: 'fanout',
  },
};

function useFetchSingleMostRecentMessagesFromThreads(): (
  threadIDs: $ReadOnlyArray<string>,
) => Promise<SimpleMessagesPayload> {
  return useKeyserverCall(fetchSingleMostRecentMessagesFromThreads);
}

export type SendTextMessageInput = {
  threadID: string,
  localID: string,
  text: string,
  sidebarCreation?: boolean,
};

const sendTextMessageActionTypes = Object.freeze({
  started: 'SEND_TEXT_MESSAGE_STARTED',
  success: 'SEND_TEXT_MESSAGE_SUCCESS',
  failed: 'SEND_TEXT_MESSAGE_FAILED',
});
const sendTextMessageActionFunc =
  (
    callServerEndpoint: CallKeyserverEndpoint<SendTextMessageInput>,
  ): ((input: SendTextMessageInput) => Promise<SendMessageResult>) =>
  async input => {
    let resultInfo;
    const getResultInfo = (passedResultInfo: CallServerEndpointResultInfo) => {
      resultInfo = passedResultInfo;
    };
    const { threadID, localID, text, sidebarCreation } = input;
    let payload = { threadID, localID, text };
    if (sidebarCreation) {
      payload = { ...payload, sidebarCreation };
    }
    const response = await callServerEndpoint(
      'create_text_message',
      payload,
      input,
      {
        getResultInfo,
      },
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

const sendTextMessage: KeyserverCall<SendTextMessageInput, SendMessageResult> =
  {
    actionFunc: sendTextMessageActionFunc,
    config: {
      keyserverSelection: 'specific',
      keyserverIDExtractor: threadIDKeyserverIDExtractor,
    },
  };

function useSendTextMessage(): (
  request: SendTextMessageInput,
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
const sendMultimediaMessageActionFunc =
  (
    callServerEndpoint: CallKeyserverEndpoint<SendMultimediaMessageInput>,
  ): ((input: SendMultimediaMessageInput) => Promise<SendMessageResult>) =>
  async input => {
    let resultInfo;
    const getResultInfo = (passedResultInfo: CallServerEndpointResultInfo) => {
      resultInfo = passedResultInfo;
    };
    const { threadID, localID, mediaMessageContents, sidebarCreation } = input;
    let payload = { threadID, localID, mediaMessageContents };
    if (sidebarCreation) {
      payload = { ...payload, sidebarCreation };
    }
    const response = await callServerEndpoint(
      'create_multimedia_message',
      payload,
      input,
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

const sendMultimediaMessage: KeyserverCall<
  SendMultimediaMessageInput,
  SendMessageResult,
> = {
  actionFunc: sendMultimediaMessageActionFunc,
  config: {
    keyserverSelection: 'specific',
    keyserverIDExtractor: threadIDKeyserverIDExtractor,
  },
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

const legacySendMultimediaMessageActionFunc =
  (
    callServerEndpoint: CallKeyserverEndpoint<LegacySendMultimediaMessageInput>,
  ): ((
    input: LegacySendMultimediaMessageInput,
  ) => Promise<SendMessageResult>) =>
  async input => {
    let resultInfo;
    const getResultInfo = (passedResultInfo: CallServerEndpointResultInfo) => {
      resultInfo = passedResultInfo;
    };
    const { threadID, localID, mediaIDs, sidebarCreation } = input;
    let payload = { threadID, localID, mediaIDs };
    if (sidebarCreation) {
      payload = { ...payload, sidebarCreation };
    }
    const response = await callServerEndpoint(
      'create_multimedia_message',
      payload,
      input,
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

const legacySendMultimediaMessage: KeyserverCall<
  LegacySendMultimediaMessageInput,
  SendMessageResult,
> = {
  actionFunc: legacySendMultimediaMessageActionFunc,
  config: {
    keyserverSelection: 'specific',
    keyserverIDExtractor: threadIDKeyserverIDExtractor,
  },
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
const sendReactionMessageActionFunc =
  (
    callServerEndpoint: CallKeyserverEndpoint<SendReactionMessageRequest>,
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
      request,
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

const sendReactionMessage: KeyserverCall<
  SendReactionMessageRequest,
  SendMessageResult,
> = {
  actionFunc: sendReactionMessageActionFunc,
  config: {
    keyserverSelection: 'specific',
    keyserverIDExtractor: threadIDKeyserverIDExtractor,
  },
};

function useSendReactionMessage(): (
  request: SendReactionMessageRequest,
) => Promise<SendMessageResult> {
  return useKeyserverCall(sendReactionMessage);
}

const sendEditMessageActionTypes = Object.freeze({
  started: 'SEND_EDIT_MESSAGE_STARTED',
  success: 'SEND_EDIT_MESSAGE_SUCCESS',
  failed: 'SEND_EDIT_MESSAGE_FAILED',
});
const sendEditMessageActionFunc =
  (
    callServerEndpoint: CallKeyserverEndpoint<SendEditMessageRequest>,
  ): ((request: SendEditMessageRequest) => Promise<SendEditMessageResult>) =>
  async request => {
    const response = await callServerEndpoint(
      'edit_message',
      {
        targetMessageID: request.targetMessageID,
        text: request.text,
      },
      request,
    );
    return {
      newMessageInfos: response.newMessageInfos,
    };
  };

const sendEditMessage: KeyserverCall<
  SendEditMessageRequest,
  SendEditMessageResult,
> = {
  actionFunc: sendEditMessageActionFunc,
  config: {
    keyserverSelection: 'specific',
    keyserverIDExtractor: targetMessageKeyserverIDExtractor,
  },
};

function useSendEditMessage(): (
  request: SendEditMessageRequest,
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
const fetchPinnedMessagesActionFunc =
  (
    callServerEndpoint: CallKeyserverEndpoint<FetchPinnedMessagesRequest>,
  ): ((
    request: FetchPinnedMessagesRequest,
  ) => Promise<FetchPinnedMessagesResult>) =>
  async request => {
    const responses = await callServerEndpoint(
      'fetch_pinned_messages',
      request,
      request,
    );
    let pinnedMessages = [];
    for (const response of responses) {
      pinnedMessages = pinnedMessages.concat(response.pinnedMessages);
    }
    return { pinnedMessages };
  };

const fetchPinnedMessages: KeyserverCall<
  FetchPinnedMessagesRequest,
  FetchPinnedMessagesResult,
> = {
  actionFunc: fetchPinnedMessagesActionFunc,
  config: { keyserverSelection: 'fanout' },
};

function useFetchPinnedMessages(): (
  request: FetchPinnedMessagesRequest,
) => Promise<FetchPinnedMessagesResult> {
  return useKeyserverCall(fetchPinnedMessages);
}

const searchMessagesActionTypes = Object.freeze({
  started: 'SEARCH_MESSAGES_STARTED',
  success: 'SEARCH_MESSAGES_SUCCESS',
  failed: 'SEARCH_MESSAGES_FAILED',
});

const searchMessagesActionFunc =
  (
    callServerEndpoint: CallKeyserverEndpoint<SearchMessagesRequest>,
  ): ((request: SearchMessagesRequest) => Promise<SearchMessagesResponse>) =>
  async request => {
    const responses = await callServerEndpoint(
      'search_messages',
      request,
      request,
    );

    let messages = [];
    let endReached = true;
    for (const response of responses) {
      messages = messages.concat(response.messages);
      if (!response.endReached) {
        endReached = false;
      }
    }

    return {
      messages,
      endReached,
    };
  };

const searchMessages: KeyserverCall<
  SearchMessagesRequest,
  SearchMessagesResponse,
> = {
  actionFunc: searchMessagesActionFunc,
  config: { keyserverSelection: 'fanout' },
};

function useSearchMessages(): (
  request: SearchMessagesRequest,
) => Promise<SearchMessagesResponse> {
  return useKeyserverCall(searchMessages);
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
};
