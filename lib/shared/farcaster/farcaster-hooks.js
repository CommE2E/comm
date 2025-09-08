// @flow

import * as React from 'react';
import uuid from 'uuid';

import {
  processFarcasterOpsActionType,
  type ProcessFarcasterOpsPayload,
} from './farcaster-actions.js';
import {
  useFetchFarcasterConversation,
  useFetchFarcasterInbox,
  useFetchFarcasterMessages,
  useSendFarcasterTextMessage,
} from './farcaster-api.js';
import type { FarcasterConversation } from './farcaster-conversation-types.js';
import {
  type FarcasterMessage,
  farcasterMessageValidator,
} from './farcaster-messages-types.js';
import { useGetCommFCUsersForFIDs } from '../../hooks/user-identities-hooks.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import { messageTruncationStatus } from '../../types/message-types.js';
import type { Dispatch } from '../../types/redux-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { extractFarcasterIDsFromPayload } from '../../utils/conversion-utils.js';
import { convertFarcasterMessageToCommMessages } from '../../utils/convert-farcaster-message-to-comm-messages.js';
import { createFarcasterRawThreadInfo } from '../../utils/create-farcaster-raw-thread-info.js';
import { useSetFarcasterDCsLoaded } from '../../utils/farcaster-utils.js';
import { values } from '../../utils/objects.js';
import { useDispatch, useSelector } from '../../utils/redux-utils.js';
import sleep from '../../utils/sleep.js';
import { useSendDMOperationUtils } from '../dm-ops/dm-op-utils.js';
import {
  conversationIDFromFarcasterThreadID,
  userIDFromFID,
} from '../id-utils.js';

const FARCASTER_DATA_BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

class BatchedUpdates {
  userIDs: Set<string>;
  updateInfos: Array<ClientUpdateInfo>;
  messageInfos: Array<RawMessageInfo>;
  additionalMessageInfos: Array<RawMessageInfo>;

  constructor() {
    this.userIDs = new Set<string>();
    this.updateInfos = ([]: Array<ClientUpdateInfo>);
    this.messageInfos = ([]: Array<RawMessageInfo>);
    this.additionalMessageInfos = ([]: Array<RawMessageInfo>);
  }

  addUserID(userID: string): void {
    this.userIDs.add(userID);
  }

  addUserIDs(userIDs: Array<string>): void {
    userIDs.forEach(userID => this.userIDs.add(userID));
  }

  addUpdateInfo(updateInfo: ClientUpdateInfo): void {
    this.updateInfos.push(updateInfo);
  }

  addMessageInfo(messageInfo: RawMessageInfo): void {
    this.messageInfos.push(messageInfo);
  }

  addMessageInfos(messageInfos: Array<RawMessageInfo>): void {
    this.messageInfos.push(...messageInfos);
  }

  addAdditionalMessageInfo(messageInfo: RawMessageInfo): void {
    this.additionalMessageInfos.push(messageInfo);
  }

  addAdditionalMessageInfos(messageInfos: Array<RawMessageInfo>): void {
    this.additionalMessageInfos.push(...messageInfos);
  }

  isEmpty(): boolean {
    return (
      this.userIDs.size === 0 &&
      this.updateInfos.length === 0 &&
      this.messageInfos.length === 0 &&
      this.additionalMessageInfos.length === 0
    );
  }

  merge(other: BatchedUpdates): void {
    other.userIDs.forEach(userID => this.userIDs.add(userID));
    this.updateInfos.push(...other.updateInfos);
    this.messageInfos.push(...other.messageInfos);
    this.additionalMessageInfos.push(...other.additionalMessageInfos);
  }

  getReduxPayload(): ProcessFarcasterOpsPayload {
    return {
      rawMessageInfos: this.messageInfos,
      updateInfos: this.updateInfos,
      userIDs: this.userIDs.size > 0 ? Array.from(this.userIDs) : undefined,
      additionalMessageInfos:
        this.additionalMessageInfos.length > 0
          ? this.additionalMessageInfos
          : undefined,
    };
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS,
): Promise<T> {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt <= maxRetries) {
        const delay = delayMs * attempt;
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

async function processInBatchesWithReduxBatching<T, R>(
  items: $ReadOnlyArray<T>,
  batchSize: number,
  processor: (item: T, batchedUpdates: BatchedUpdates) => Promise<R>,
  dispatch: Dispatch,
): Promise<Array<R>> {
  const results: Array<R> = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchPromises = batch.map(async item => {
      try {
        const itemBatchedUpdates = new BatchedUpdates();
        const result = await processor(item, itemBatchedUpdates);
        return { result, updates: itemBatchedUpdates };
      } catch (error) {
        console.log('Error processing item:', item, 'Error:', error);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);

    const allBatchedUpdates = new BatchedUpdates();
    const validResults: Array<R> = [];

    for (const itemResult of batchResults) {
      if (itemResult) {
        validResults.push(itemResult.result);
        allBatchedUpdates.merge(itemResult.updates);
      }
    }

    results.push(...validResults);

    if (!allBatchedUpdates.isEmpty()) {
      dispatch({
        type: processFarcasterOpsActionType,
        payload: allBatchedUpdates.getReduxPayload(),
      });
    }

    // This should help with the app responsiveness
    await sleep(0);
  }

  return results;
}

function useFetchConversationWithBatching(): (
  conversationID: string,
  batchedUpdates: BatchedUpdates,
) => Promise<?FarcasterConversation> {
  const fetchUsersByFIDs = useGetCommFCUsersForFIDs();
  const fetchFarcasterConversation = useFetchFarcasterConversation();

  return React.useCallback(
    async (
      conversationID: string,
      batchedUpdates: BatchedUpdates,
    ): Promise<?FarcasterConversation> => {
      try {
        const conversationResult = await withRetry(
          () =>
            fetchFarcasterConversation({
              conversationId: conversationID,
            }),
          MAX_RETRIES,
          RETRY_DELAY_MS,
        );

        if (!conversationResult) {
          return null;
        }

        const farcasterConversation = conversationResult.result.conversation;
        let thread = createFarcasterRawThreadInfo(farcasterConversation);
        const fids = thread.members.map(member => member.id);
        const commFCUsersForFIDs = await fetchUsersByFIDs(fids);
        const threadMembers = thread.members.map(member => ({
          ...member,
          id:
            commFCUsersForFIDs.get(member.id)?.userID ??
            userIDFromFID(member.id),
        }));

        thread = {
          ...thread,
          members: threadMembers,
        };

        const update = {
          type: updateTypes.JOIN_THREAD,
          id: uuid.v4(),
          time: thread.creationTime,
          threadInfo: thread,
          rawMessageInfos: [],
          truncationStatus: messageTruncationStatus.UNCHANGED,
          rawEntryInfos: [],
        };

        if (threadMembers.length > 0) {
          threadMembers.forEach(member => batchedUpdates.addUserID(member.id));
        }
        batchedUpdates.addUpdateInfo(update);

        return farcasterConversation;
      } catch (e) {
        console.error(`Failed fetching conversation ${conversationID}:`, e);
        return null;
      }
    },
    [fetchFarcasterConversation, fetchUsersByFIDs],
  );
}

function useFetchMessagesForConversation(): (
  conversationID: string,
  messagesNumberLimit?: number,
  batchedUpdates: BatchedUpdates,
) => Promise<void> {
  const fetchFarcasterMessages = useFetchFarcasterMessages();
  const fetchUsersByFIDs = useGetCommFCUsersForFIDs();

  return React.useCallback(
    async (
      conversationID: string,
      messagesNumberLimit: number = 20,
      batchedUpdates: BatchedUpdates,
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

          const messagesResult = await withRetry(
            () => fetchFarcasterMessages(messagesInput),
            MAX_RETRIES,
            RETRY_DELAY_MS,
          );

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
              Array.from(fcUserInfos.entries()).forEach(([fid, user]) =>
                batchedUpdates.addUserID(user?.userID ?? userIDFromFID(fid)),
              );
            }
            if (rawMessageInfos.length > 0) {
              if (totalMessagesFetched === 0) {
                batchedUpdates.addMessageInfos(rawMessageInfos);
              } else {
                batchedUpdates.addAdditionalMessageInfos(rawMessageInfos);
              }
            }
            totalMessagesFetched += farcasterMessages.length;

            cursor = messagesResult.next?.cursor;
          } else {
            cursor = null;
          }
          // This should help with the app responsiveness
          await sleep(0);
        } while (cursor && totalMessagesFetched < messagesNumberLimit);
      } catch (e) {
        console.error(`Failed fetching messages for ${conversationID}:`, e);
      }
    },
    [fetchFarcasterMessages, fetchUsersByFIDs],
  );
}

function useRefreshFarcasterConversation(): (
  conversationID: string,
) => Promise<void> {
  const fetchConversation = useFetchConversationWithBatching();
  const fetchMessagesForConversation = useFetchMessagesForConversation();
  const dispatch = useDispatch();

  return React.useCallback(
    async (conversationID: string) => {
      const batchedUpdates = new BatchedUpdates();

      await fetchConversation(conversationID, batchedUpdates);
      await fetchMessagesForConversation(conversationID, 20, batchedUpdates);

      if (!batchedUpdates.isEmpty()) {
        dispatch({
          type: processFarcasterOpsActionType,
          payload: batchedUpdates.getReduxPayload(),
        });
      }
    },
    [fetchConversation, fetchMessagesForConversation, dispatch],
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
  const fetchConversation = useFetchConversationWithBatching();
  const fetchMessagesForConversation = useFetchMessagesForConversation();

  const threadInfos = useSelector(state => state.threadStore.threadInfos);

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
        const { result, next } = await withRetry(
          () => fetchFarcasterInbox(input),
          MAX_RETRIES,
          RETRY_DELAY_MS,
        );
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

  const removeDeadThreads = React.useCallback(() => {
    const conversationsSet = new Set(conversations);
    const time = Date.now();

    const updateInfos = values(threadInfos)
      .filter(
        threadInfo =>
          threadInfo.farcaster &&
          !conversationsSet.has(
            conversationIDFromFarcasterThreadID(threadInfo.id),
          ),
      )
      .map(threadInfo => ({
        type: updateTypes.DELETE_THREAD,
        id: uuid.v4(),
        time,
        threadID: threadInfo.id,
      }));

    dispatch({
      type: processFarcasterOpsActionType,
      payload: {
        rawMessageInfos: [],
        updateInfos,
      },
    });
  }, [conversations, dispatch, threadInfos]);

  const [inProgress, setInProgress] = React.useState(false);
  const setFarcasterDCsLoaded = useSetFarcasterDCsLoaded();
  React.useEffect(() => {
    if (!fullInbox || conversations.length === 0 || inProgress) {
      return;
    }
    setInProgress(true);

    removeDeadThreads();

    void (async () => {
      const farcasterConversations: Array<FarcasterConversation> = [];

      const conversationResults = await processInBatchesWithReduxBatching(
        conversations,
        FARCASTER_DATA_BATCH_SIZE,
        (conversationID, batchedUpdates) =>
          fetchConversation(conversationID, batchedUpdates),
        dispatch,
      );

      const successfulConversations = conversationResults.filter(Boolean);
      farcasterConversations.push(...successfulConversations);

      await processInBatchesWithReduxBatching(
        farcasterConversations,
        FARCASTER_DATA_BATCH_SIZE,
        (conversation, batchedUpdates) =>
          fetchMessagesForConversation(
            conversation.conversationId,
            messagesNumberLimit,
            batchedUpdates,
          ),
        dispatch,
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
    threadInfos,
    removeDeadThreads,
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

function useAddNewFarcasterMessage(): FarcasterMessage => Promise<void> {
  const dispatch = useDispatch();
  const fetchUsersByFIDs = useGetCommFCUsersForFIDs();

  return React.useCallback(
    async (farcasterMessage: FarcasterMessage) => {
      const userFIDs = extractFarcasterIDsFromPayload(
        farcasterMessageValidator,
        farcasterMessage,
      );
      const fcUserInfos = await fetchUsersByFIDs(userFIDs);
      const rawMessageInfos = convertFarcasterMessageToCommMessages(
        farcasterMessage,
        fcUserInfos,
      );
      const userIDs = userFIDs.map(fid => userIDFromFID(`${fid}`));
      dispatch({
        type: processFarcasterOpsActionType,
        payload: { rawMessageInfos, updateInfos: [], userIDs },
      });
    },
    [dispatch, fetchUsersByFIDs],
  );
}

function useFetchConversation(): (
  conversationID: string,
) => Promise<?FarcasterConversation> {
  const fetchConversation = useFetchConversationWithBatching();
  const dispatch = useDispatch();

  return React.useCallback(
    async (conversationID: string): Promise<?FarcasterConversation> => {
      const batchedUpdates = new BatchedUpdates();

      const result = await fetchConversation(conversationID, batchedUpdates);

      if (!batchedUpdates.isEmpty()) {
        dispatch({
          type: processFarcasterOpsActionType,
          payload: batchedUpdates.getReduxPayload(),
        });
      }

      return result;
    },
    [fetchConversation, dispatch],
  );
}

export {
  useFarcasterConversationsSync,
  useFetchConversationWithBatching,
  useFetchConversation,
  useFetchMessagesForConversation,
  useRefreshFarcasterConversation,
  useAddNewFarcasterMessage,
};
