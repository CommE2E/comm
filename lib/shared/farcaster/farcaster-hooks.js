// @flow

import * as React from 'react';

import {
  type FetchFarcasterConversationResult,
  useFetchFarcasterConversation,
  useFetchFarcasterInbox,
  type FetchFarcasterMessageResult,
  useFetchFarcasterMessages,
  useSendFarcasterTextMessage,
} from './farcaster-api.js';
import type { FarcasterConversation } from './farcaster-conversation-types.js';
import type { FarcasterMessage } from './farcaster-messages-types.js';
import { useDispatch } from '../../utils/redux-utils.js';
import { useSendDMOperationUtils } from '../dm-ops/dm-op-utils.js';

function useFarcasterConversationsSync(): () => Promise<void> {
  const [fullInbox, setFullInbox] = React.useState(false);
  const [conversations, setConversations] = React.useState<
    $ReadOnlyArray<string>,
  >([]);

  const fetchFarcasterInbox = useFetchFarcasterInbox();
  const fetchFarcasterConversation = useFetchFarcasterConversation();
  const fetchFarcasterMessages = useFetchFarcasterMessages();
  const sendFarcasterTextMessage = useSendFarcasterTextMessage();
  const dispatch = useDispatch();
  const utils = useSendDMOperationUtils();

  const fetchInboxes: (cursor: ?string) => Promise<void> = React.useCallback(
    async (cursor: ?string) => {
      try {
        let input = { limit: 20 };
        if (cursor) {
          input = {
            ...input,
            cursor,
          };
        }
        const { result, next } = await fetchFarcasterInbox(input);
        setConversations(prev => {
          const ids = result.conversations.map(
            conversation => conversation.conversationId,
          );
          return [...prev, ...ids];
        });
        if (next?.cursor) {
          void fetchInboxes(next.cursor);
        } else {
          setFullInbox(true);
        }
      } catch (e) {
        console.error('Error fetching inbox', e);
        setFullInbox(true);
      }
    },
    [fetchFarcasterInbox],
  );

  React.useEffect(() => {
    if (!fullInbox || conversations.length === 0) {
      return;
    }

    void (async () => {
      const conversationPromises: $ReadOnlyArray<
        Promise<?FetchFarcasterConversationResult>,
      > = conversations.map(async conversationId => {
        try {
          return await fetchFarcasterConversation({ conversationId });
        } catch (e) {
          console.error(`Failed fetching conversation ${conversationId}:`, e);
          return null;
        }
      });

      const farcasterConversationsResults: $ReadOnlyArray<?FetchFarcasterConversationResult> =
        await Promise.all(conversationPromises);

      const farcasterConversations: $ReadOnlyArray<FarcasterConversation> =
        farcasterConversationsResults
          .filter(Boolean)
          .map(conversationResult => conversationResult.result.conversation);

      console.log('Farcaster conversations:', farcasterConversations);

      const messagePromises: $ReadOnlyArray<
        Promise<?FetchFarcasterMessageResult>,
      > = farcasterConversations.map(async ({ conversationId }) => {
        try {
          return await fetchFarcasterMessages({ conversationId, limit: 30 });
        } catch (e) {
          console.error(`Failed fetching messages for ${conversationId}:`, e);
          return null;
        }
      });

      const farcasterMessagesResult: $ReadOnlyArray<?FetchFarcasterMessageResult> =
        await Promise.all(messagePromises);

      const farcasterMessages: $ReadOnlyArray<FarcasterMessage> =
        farcasterMessagesResult
          .filter(Boolean)
          .flatMap(messagesResult => messagesResult.result.messages);

      console.log('Farcaster messages:', farcasterMessages);

      //TODO: dispatch threads and messages
      setConversations([]);
    })();
  }, [
    conversations,
    dispatch,
    fetchFarcasterConversation,
    fetchFarcasterMessages,
    fullInbox,
    sendFarcasterTextMessage,
    utils,
  ]);

  return React.useCallback(async () => {
    setFullInbox(false);
    void fetchInboxes(null);
  }, [fetchInboxes]);
}

export { useFarcasterConversationsSync };
