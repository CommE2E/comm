// @flow

import * as React from 'react';
import uuid from 'uuid';

import { processFarcasterOpsActionType } from './farcaster-actions.js';
import {
  useFetchFarcasterConversation,
  useFetchFarcasterInbox,
  useFetchFarcasterMessages,
  useSendFarcasterTextMessage,
} from './farcaster-api.js';
import type { FarcasterConversation } from './farcaster-conversation-types.js';
import { messageTruncationStatus } from '../../types/message-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import {
  convertFarcasterMessageToCommMessages,
  createFarcasterRawThreadInfo,
} from '../../utils/farcaster-utils.js';
import { useDispatch } from '../../utils/redux-utils.js';
import { useSendDMOperationUtils } from '../dm-ops/dm-op-utils.js';

function useFarcasterConversationsSync(): (limit: number) => Promise<void> {
  const [fullInbox, setFullInbox] = React.useState(false);
  const [conversations, setConversations] = React.useState<
    $ReadOnlyArray<string>,
  >([]);
  const [messagesNumberLimit, setMessagesNumberLimit] = React.useState(20);

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

  const [inProgress, setInProgress] = React.useState(false);
  React.useEffect(() => {
    if (!fullInbox || conversations.length === 0 || inProgress) {
      return;
    }
    setInProgress(true);

    void (async () => {
      const farcasterConversations: Array<FarcasterConversation> = [];
      for (const conversationId of conversations) {
        try {
          const conversationResult = await fetchFarcasterConversation({
            conversationId,
          });

          if (!conversationResult) {
            continue;
          }

          const farcasterConversation = conversationResult.result.conversation;
          farcasterConversations.push(farcasterConversation);
          const thread = createFarcasterRawThreadInfo(farcasterConversation);
          const update = {
            type: updateTypes.JOIN_THREAD,
            id: uuid.v4(),
            time: thread.creationTime,
            threadInfo: thread,
            rawMessageInfos: [],
            truncationStatus: messageTruncationStatus.UNCHANGED,
            rawEntryInfos: [],
          };

          dispatch({
            type: processFarcasterOpsActionType,
            payload: {
              rawMessageInfos: [],
              updateInfos: [update],
            },
          });
        } catch (e) {
          console.error(`Failed fetching conversation ${conversationId}:`, e);
        }
      }

      for (const farcasterConversation of farcasterConversations) {
        try {
          let cursor: ?string = null;
          let totalMessagesFetched = 0;

          do {
            const batchLimit = Math.min(
              20,
              messagesNumberLimit - totalMessagesFetched,
            );

            if (batchLimit <= 0) {
              break;
            }

            const messagesInput = {
              conversationId: farcasterConversation.conversationId,
              limit: batchLimit,
              ...(cursor ? { cursor } : {}),
            };

            const messagesResult = await fetchFarcasterMessages(messagesInput);

            if (messagesResult) {
              const farcasterMessages = messagesResult.result.messages;
              const rawMessageInfos = farcasterMessages.flatMap(
                convertFarcasterMessageToCommMessages,
              );

              if (rawMessageInfos.length > 0) {
                const payload =
                  totalMessagesFetched === 0
                    ? { rawMessageInfos, updateInfos: [] }
                    : {
                        rawMessageInfos: [],
                        updateInfos: [],
                        additionalMessageInfos: rawMessageInfos,
                      };
                dispatch({
                  type: processFarcasterOpsActionType,
                  payload,
                });
                totalMessagesFetched += farcasterMessages.length;
              }

              cursor = messagesResult.next?.cursor;
            } else {
              cursor = null;
            }
          } while (cursor && totalMessagesFetched < messagesNumberLimit);
        } catch (e) {
          console.error(
            `Failed fetching messages for ${farcasterConversation.conversationId}:`,
            e,
          );
        }
      }

      setConversations([]);
      setInProgress(false);
    })();
  }, [
    conversations,
    dispatch,
    fetchFarcasterConversation,
    fetchFarcasterMessages,
    fullInbox,
    inProgress,
    messagesNumberLimit,
    sendFarcasterTextMessage,
    utils,
  ]);

  return React.useCallback(
    async (limit: number) => {
      setMessagesNumberLimit(limit);
      setFullInbox(false);
      void fetchInboxes(null);
    },
    [fetchInboxes],
  );
}

export { useFarcasterConversationsSync };
