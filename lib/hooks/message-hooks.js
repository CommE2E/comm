// @flow

import * as React from 'react';

import { useGetMessageAuthor } from './message-author.js';
import type {
  FetchMessagesBeforeCursorInput,
  FetchMostRecentMessagesInput,
  LegacySendMultimediaMessageInput,
  SendMultimediaMessageInput,
  SendTextMessageInput,
} from '../actions/message-actions.js';
import {
  extractKeyserverIDFromID,
  extractKeyserverIDFromIDOptional,
  sortThreadIDsPerKeyserver,
} from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import { messageInfoSelector } from '../selectors/chat-selectors.js';
import { getOldestNonLocalMessageID } from '../shared/id-utils.js';
import { useFetchMessages } from '../shared/message-utils.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import { messageTypes } from '../types/message-types-enum.js';
import {
  type DeleteMessageRequest,
  type DeleteMessageResponse,
  type FetchMessageInfosPayload,
  type FetchMessageInfosRequest,
  type FetchPinnedMessagesRequest,
  type FetchPinnedMessagesResult,
  type MessageTruncationStatuses,
  type RawMessageInfo,
  type SearchMessagesKeyserverRequest,
  type SearchMessagesRequest,
  type SearchMessagesResponse,
  type SendEditMessageRequest,
  type SendEditMessageResult,
  type SendMessageResult,
  type SendReactionMessageRequest,
  type SimpleMessagesPayload,
  defaultNumberPerThread,
  type MessageInfo,
} from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type {
  ToggleMessagePinRequest,
  ToggleMessagePinResult,
} from '../types/thread-types.js';
import { getConfig } from '../utils/config.js';
import { translateClientDBMessageInfoToRawMessageInfo } from '../utils/message-ops-utils.js';
import { useSelector } from '../utils/redux-utils.js';
import sleep from '../utils/sleep.js';

function useOldestMessageServerID(threadID: string): ?string {
  return useSelector(state =>
    getOldestNonLocalMessageID(threadID, state.messageStore),
  );
}

type MessageInfoForPreview = {
  +messageInfoForPreview: ?MessageInfo,
  // If showInMessagePreview rejects all of the messages in the local store,
  // then we'll ignore it and return the most recent message (if there is one)
  // as messageInfoForPreview. In this case, we'll also set
  // numOlderMessagesToFetch to tell the caller how many more messages to fetch.
  +numOlderMessagesToFetch: number,
};

const emptyMessageInfoForPreview = {
  messageInfoForPreview: undefined,
  numOlderMessagesToFetch: 0,
};

function useGetMessageInfoForPreview(): (
  threadInfo: ThreadInfo,
) => Promise<MessageInfoForPreview> {
  const messageInfos = useSelector(messageInfoSelector);
  const messageStore = useSelector(state => state.messageStore);
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  const getMessageAuthor = useGetMessageAuthor();
  return React.useCallback(
    async threadInfo => {
      if (!viewerID) {
        return emptyMessageInfoForPreview;
      }
      const thread = messageStore.threads[threadInfo.id];
      if (!thread) {
        return emptyMessageInfoForPreview;
      }
      const showInMessagePreviewParams = {
        threadInfo,
        viewerID,
        getMessageAuthor,
      };
      let mostRecentMessageInfo;
      const deletedMessageIDs = new Set<string>();
      for (const messageID of thread.messageIDs) {
        const messageInfo = messageInfos[messageID];
        if (!messageInfo) {
          continue;
        }
        if (messageInfo.type === messageTypes.DELETE_MESSAGE) {
          deletedMessageIDs.add(messageInfo.targetMessageID);
        }
        if (!mostRecentMessageInfo) {
          mostRecentMessageInfo = messageInfo;
        }
        const { showInMessagePreview } = messageSpecs[messageInfo.type];
        if (deletedMessageIDs.has(messageID)) {
          continue;
        }
        if (!showInMessagePreview) {
          return {
            messageInfoForPreview: messageInfo,
            numOlderMessagesToFetch: 0,
          };
        }
        let shouldShow = showInMessagePreview(
          messageInfo,
          showInMessagePreviewParams,
        );
        if (shouldShow instanceof Promise) {
          shouldShow = await shouldShow;
        }
        if (shouldShow) {
          return {
            messageInfoForPreview: messageInfo,
            numOlderMessagesToFetch: 0,
          };
        }
      }

      if (thread.startReached) {
        return emptyMessageInfoForPreview;
      }

      const numOlderMessagesToFetch = Math.max(
        defaultNumberPerThread - thread.messageIDs.length,
        0,
      );
      // If we get here, that means showInMessagePreview rejected all of the
      // messages in the local store
      return {
        messageInfoForPreview: mostRecentMessageInfo,
        numOlderMessagesToFetch,
      };
    },
    [messageInfos, messageStore, viewerID, getMessageAuthor],
  );
}

function useMessageInfoForPreview(threadInfo: ThreadInfo): ?MessageInfo {
  const [messageInfoForPreview, setMessageInfoForPreview] =
    React.useState<?MessageInfoForPreview>();

  const getMessageInfoForPreview = useGetMessageInfoForPreview();
  React.useEffect(() => {
    void (async () => {
      const newMessageInfoForPreview =
        await getMessageInfoForPreview(threadInfo);
      setMessageInfoForPreview(newMessageInfoForPreview);
    })();
  }, [threadInfo, getMessageInfoForPreview]);

  const numOlderMessagesToFetch =
    messageInfoForPreview?.numOlderMessagesToFetch ?? 0;

  const [canFetchOlderMessages, setCanFetchOlderMessages] =
    React.useState(true);
  const fetchMessages = useFetchMessages(threadInfo);
  React.useEffect(() => {
    if (!canFetchOlderMessages || numOlderMessagesToFetch === 0) {
      return;
    }
    setCanFetchOlderMessages(false);
    void (async () => {
      await fetchMessages({ numMessagesToFetch: numOlderMessagesToFetch });
      await sleep(3000);
      setCanFetchOlderMessages(true);
    })();
  }, [canFetchOlderMessages, numOlderMessagesToFetch, fetchMessages]);

  return messageInfoForPreview?.messageInfoForPreview;
}

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
      [keyserverID]: ({
        cursors: {
          [threadID]: beforeMessageID,
        },
      }: { [string]: mixed }),
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
      [keyserverID]: ({
        cursors: {
          [threadID]: null,
        },
      }: { [string]: mixed }),
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

const sendDeleteMessage =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: DeleteMessageRequest) => Promise<DeleteMessageResponse>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.targetMessageID);
    const requests = {
      [keyserverID]: {
        targetMessageID: input.targetMessageID,
      },
    };

    const responses = await callKeyserverEndpoint('delete_message', requests);

    return {
      newMessageInfos: responses[keyserverID].newMessageInfos,
    };
  };

function useSendDeleteMessage(): (
  input: DeleteMessageRequest,
) => Promise<DeleteMessageResponse> {
  return useKeyserverCall(sendDeleteMessage);
}

export {
  useOldestMessageServerID,
  useMessageInfoForPreview,
  useSendDeleteMessage,
  useToggleMessagePin,
  useSearchMessages,
  useFetchPinnedMessages,
  useSendEditMessage,
  useSendReactionMessage,
  useLegacySendMultimediaMessage,
  useSendMultimediaMessage,
  useSendTextMessage,
  useFetchSingleMostRecentMessagesFromThreads,
  useFetchMostRecentMessages,
  useFetchMessagesBeforeCursor,
};
