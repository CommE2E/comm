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
import {
  farcasterMessageValidator,
  type FarcasterMessage,
} from './farcaster-messages-types.js';
import { processNewUserIDsActionType } from '../../actions/user-actions.js';
import { useGetCommFCUsersForFIDs } from '../../hooks/user-identities-hooks.js';
import { messageTruncationStatus } from '../../types/message-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { extractFarcasterIDsFromPayload } from '../../utils/conversion-utils.js';
import { convertFarcasterMessageToCommMessages } from '../../utils/convert-farcaster-message-to-comm-messages.js';
import { createFarcasterRawThreadInfo } from '../../utils/create-farcaster-raw-thread-info.js';
import { useSetFarcasterDCsLoaded } from '../../utils/farcaster-utils.js';
import { useDispatch } from '../../utils/redux-utils.js';
import { useSendDMOperationUtils } from '../dm-ops/dm-op-utils.js';
import { userIDFromFID } from '../id-utils.js';

async function processInBatches<T, R>(
  items: $ReadOnlyArray<T>,
  batchSize: number,
  processor: (item: T) => Promise<R>,
): Promise<Array<R>> {
  const results: Array<R> = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

function useFetchConversation(): (
  conversationID: string,
) => Promise<?FarcasterConversation> {
  const fetchFarcasterConversation = useFetchFarcasterConversation();
  const dispatch = useDispatch();

  return React.useCallback(
    async (conversationID: string): Promise<?FarcasterConversation> => {
      try {
        const conversationResult = await fetchFarcasterConversation({
          conversationId: conversationID,
        });

        if (!conversationResult) {
          return null;
        }

        const farcasterConversation = conversationResult.result.conversation;
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

        return farcasterConversation;
      } catch (e) {
        console.error(`Failed fetching conversation ${conversationID}:`, e);
        return null;
      }
    },
    [fetchFarcasterConversation, dispatch],
  );
}

function useFetchMessagesForConversation(): (
  conversationID: string,
  messagesNumberLimit?: number,
) => Promise<void> {
  const fetchFarcasterMessages = useFetchFarcasterMessages();
  const fetchUsersByFIDs = useGetCommFCUsersForFIDs();
  const dispatch = useDispatch();

  return React.useCallback(
    async (
      conversationID: string,
      messagesNumberLimit: number = 20,
    ): Promise<void> => {
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
            conversationId: conversationID,
            limit: batchLimit,
            ...(cursor ? { cursor } : {}),
          };

          const messagesResult = await fetchFarcasterMessages(messagesInput);

          if (messagesResult) {
            const farcasterMessages = messagesResult.result.messages;

            const userFIDs = farcasterMessages.flatMap(message =>
              extractFarcasterIDsFromPayload(
                farcasterMessageValidator,
                message,
              ),
            );
            const fcUserInfos = await fetchUsersByFIDs(userFIDs);

            const rawMessageInfos = farcasterMessages.flatMap(message =>
              convertFarcasterMessageToCommMessages(message, fcUserInfos),
            );

            if (fcUserInfos.size > 0) {
              const newUserIDs = Array.from(fcUserInfos.entries()).map(
                ([fid, user]) => user?.userID ?? userIDFromFID(fid),
              );
              dispatch({
                type: processNewUserIDsActionType,
                payload: { userIDs: newUserIDs },
              });
            }

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
        console.error(`Failed fetching messages for ${conversationID}:`, e);
      }
    },
    [fetchFarcasterMessages, fetchUsersByFIDs, dispatch],
  );
}

function useRefreshFarcasterConversation(): (
  conversationID: string,
) => Promise<void> {
  const fetchConversation = useFetchConversation();
  const fetchMessagesForConversation = useFetchMessagesForConversation();
  return React.useCallback(
    async (conversationID: string) => {
      await fetchConversation(conversationID);
      await fetchMessagesForConversation(conversationID);
    },
    [fetchConversation, fetchMessagesForConversation],
  );
}

function useFarcasterConversationsSync(): (limit: number) => Promise<void> {
  const [fullInbox, setFullInbox] = React.useState(false);
  const [conversations, setConversations] = React.useState<
    $ReadOnlyArray<string>,
  >([]);
  const [messagesNumberLimit, setMessagesNumberLimit] = React.useState(20);

  const fetchFarcasterInbox = useFetchFarcasterInbox();
  const sendFarcasterTextMessage = useSendFarcasterTextMessage();
  const dispatch = useDispatch();
  const utils = useSendDMOperationUtils();
  const fetchConversation = useFetchConversation();
  const fetchMessagesForConversation = useFetchMessagesForConversation();

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
  const setFarcasterDCsLoaded = useSetFarcasterDCsLoaded();
  React.useEffect(() => {
    if (!fullInbox || conversations.length === 0 || inProgress) {
      return;
    }
    setInProgress(true);

    void (async () => {
      const farcasterConversations: Array<FarcasterConversation> = [];

      const conversationResults = await processInBatches(
        conversations,
        20,
        fetchConversation,
      );

      farcasterConversations.push(...conversationResults.filter(Boolean));

      await processInBatches(farcasterConversations, 20, conversation =>
        fetchMessagesForConversation(
          conversation.conversationId,
          messagesNumberLimit,
        ),
      );

      setConversations([]);
      setInProgress(false);
      setFarcasterDCsLoaded(true);
    })();
  }, [
    conversations,
    dispatch,
    fetchConversation,
    fetchMessagesForConversation,
    fullInbox,
    inProgress,
    messagesNumberLimit,
    sendFarcasterTextMessage,
    utils,
    setFarcasterDCsLoaded,
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

function useAddNewFarcasterMessage(): FarcasterMessage => void {
  const dispatch = useDispatch();

  return React.useCallback(
    (farcasterMessage: FarcasterMessage) => {
      const rawMessageInfos =
        convertFarcasterMessageToCommMessages(farcasterMessage);
      dispatch({
        type: processFarcasterOpsActionType,
        payload: { rawMessageInfos, updateInfos: [] },
      });
    },
    [dispatch],
  );
}

export {
  useFarcasterConversationsSync,
  useFetchConversation,
  useFetchMessagesForConversation,
  useRefreshFarcasterConversation,
  useAddNewFarcasterMessage,
};
