// @flow

import * as React from 'react';
import uuid from 'uuid';

import { processFarcasterOpsActionType } from './farcaster-actions.js';
import {
  useFetchFarcasterConversation,
  useFetchFarcasterInbox,
  useFetchFarcasterMessages,
} from './farcaster-api.js';
import type { FarcasterConversation } from './farcaster-conversation-types.js';
import {
  type FarcasterMessage,
  farcasterMessageValidator,
} from './farcaster-messages-types.js';
import { useIsUserDataReady } from '../../hooks/backup-hooks.js';
import { useGetCommFCUsersForFIDs } from '../../hooks/user-identities-hooks.js';
import { isLoggedIn } from '../../selectors/user-selectors.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import { messageTruncationStatus } from '../../types/message-types.js';
import type { Dispatch } from '../../types/redux-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { extractFarcasterIDsFromPayload } from '../../utils/conversion-utils.js';
import { convertFarcasterMessageToCommMessages } from '../../utils/convert-farcaster-message-to-comm-messages.js';
import { createFarcasterRawThreadInfo } from '../../utils/create-farcaster-raw-thread-info.js';
import {
  useCurrentUserSupportsDCs,
  useFarcasterDCsLoaded,
  useSetFarcasterDCsLoaded,
} from '../../utils/farcaster-utils.js';
import { useDispatch, useSelector } from '../../utils/redux-utils.js';
import sleep from '../../utils/sleep.js';
import { userIDFromFID } from '../id-utils.js';

const FARCASTER_DATA_BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

type BatchedUpdates = {
  +userIDs: Set<string>,
  +updateInfos: Array<ClientUpdateInfo>,
  +messageInfos: Array<RawMessageInfo>,
  +additionalMessageInfos: Array<RawMessageInfo>,
};

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
        const itemBatchedUpdates: BatchedUpdates = {
          userIDs: new Set<string>(),
          updateInfos: ([]: Array<ClientUpdateInfo>),
          messageInfos: ([]: Array<RawMessageInfo>),
          additionalMessageInfos: ([]: Array<RawMessageInfo>),
        };
        const result = await processor(item, itemBatchedUpdates);
        return { result, updates: itemBatchedUpdates };
      } catch (error) {
        console.log('Error processing item:', item, 'Error:', error);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);

    const allUserIDs = new Set<string>();
    const allUpdateInfos: Array<ClientUpdateInfo> = [];
    const allMessageInfos: Array<RawMessageInfo> = [];
    const allAdditionalMessageInfos: Array<RawMessageInfo> = [];
    const validResults: Array<R> = [];

    for (const itemResult of batchResults) {
      if (itemResult) {
        validResults.push(itemResult.result);
        itemResult.updates.userIDs.forEach(uid => allUserIDs.add(uid));
        allUpdateInfos.push(...itemResult.updates.updateInfos);
        allMessageInfos.push(...itemResult.updates.messageInfos);
        allAdditionalMessageInfos.push(
          ...itemResult.updates.additionalMessageInfos,
        );
      }
    }

    results.push(...validResults);

    if (
      allUserIDs.size > 0 ||
      allUpdateInfos.length > 0 ||
      allMessageInfos.length > 0 ||
      allAdditionalMessageInfos.length > 0
    ) {
      const payload = {
        rawMessageInfos: allMessageInfos,
        updateInfos: allUpdateInfos,
        userIDs: allUserIDs.size > 0 ? Array.from(allUserIDs) : undefined,
        additionalMessageInfos:
          allAdditionalMessageInfos.length > 0
            ? allAdditionalMessageInfos
            : undefined,
      };

      dispatch({
        type: processFarcasterOpsActionType,
        payload,
      });
    }

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
          threadMembers.forEach(member =>
            batchedUpdates.userIDs.add(member.id),
          );
        }
        batchedUpdates.updateInfos.push(update);

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
                batchedUpdates.userIDs.add(user?.userID ?? userIDFromFID(fid)),
              );
            }
            if (rawMessageInfos.length > 0) {
              if (totalMessagesFetched === 0) {
                batchedUpdates.messageInfos.push(...rawMessageInfos);
              } else {
                batchedUpdates.additionalMessageInfos.push(...rawMessageInfos);
              }
            }
            totalMessagesFetched += farcasterMessages.length;

            cursor = messagesResult.next?.cursor;
          } else {
            cursor = null;
          }
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
      const batchedUpdates: BatchedUpdates = {
        userIDs: new Set<string>(),
        updateInfos: ([]: Array<ClientUpdateInfo>),
        messageInfos: ([]: Array<RawMessageInfo>),
        additionalMessageInfos: ([]: Array<RawMessageInfo>),
      };

      await fetchConversation(conversationID, batchedUpdates);
      await fetchMessagesForConversation(conversationID, 20, batchedUpdates);

      if (
        batchedUpdates.userIDs.size > 0 ||
        batchedUpdates.updateInfos.length > 0 ||
        batchedUpdates.messageInfos.length > 0 ||
        batchedUpdates.additionalMessageInfos.length > 0
      ) {
        const payload = {
          rawMessageInfos: batchedUpdates.messageInfos,
          updateInfos: batchedUpdates.updateInfos,
          userIDs:
            batchedUpdates.userIDs.size > 0
              ? Array.from(batchedUpdates.userIDs)
              : undefined,
          additionalMessageInfos:
            batchedUpdates.additionalMessageInfos.length > 0
              ? batchedUpdates.additionalMessageInfos
              : undefined,
        };

        dispatch({
          type: processFarcasterOpsActionType,
          payload,
        });
      }
    },
    [fetchConversation, fetchMessagesForConversation, dispatch],
  );
}

function useFarcasterConversationsSync(): (limit: number) => Promise<void> {
  const fetchFarcasterInbox = useFetchFarcasterInbox();
  const dispatch = useDispatch();
  const fetchConversation = useFetchConversationWithBatching();
  const fetchMessagesForConversation = useFetchMessagesForConversation();
  const setFarcasterDCsLoaded = useSetFarcasterDCsLoaded();

  const fetchInboxes = React.useCallback(
    async (cursor: ?string): Promise<$ReadOnlyArray<string>> => {
      const allConversations: Array<string> = [];
      let currentCursor = cursor;

      while (true) {
        try {
          let input = { limit: 20 };
          if (currentCursor) {
            input = {
              ...input,
              cursor: currentCursor,
            };
          }
          const { result, next } = await withRetry(
            () => fetchFarcasterInbox(input),
            MAX_RETRIES,
            RETRY_DELAY_MS,
          );

          const ids = result.conversations.map(
            conversation => conversation.conversationId,
          );
          allConversations.push(...ids);

          if (next?.cursor) {
            currentCursor = next.cursor;
          } else {
            break;
          }
        } catch (e) {
          console.error('Error fetching inbox', e);
          break;
        }
      }

      return allConversations;
    },
    [fetchFarcasterInbox],
  );

  return React.useCallback(
    async (limit: number) => {
      try {
        const conversations = await fetchInboxes(null);

        if (conversations.length === 0) {
          setFarcasterDCsLoaded(true);
          return;
        }

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
              limit,
              batchedUpdates,
            ),
          dispatch,
        );

        setFarcasterDCsLoaded(true);
      } catch (e) {
        console.error('Error syncing Farcaster conversations', e);
        throw e;
      }
    },
    [
      fetchInboxes,
      fetchConversation,
      fetchMessagesForConversation,
      dispatch,
      setFarcasterDCsLoaded,
    ],
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

function useFetchConversation(): (
  conversationID: string,
) => Promise<?FarcasterConversation> {
  const fetchConversation = useFetchConversationWithBatching();
  const dispatch = useDispatch();

  return React.useCallback(
    async (conversationID: string): Promise<?FarcasterConversation> => {
      const batchedUpdates: BatchedUpdates = {
        userIDs: new Set<string>(),
        updateInfos: ([]: Array<ClientUpdateInfo>),
        messageInfos: ([]: Array<RawMessageInfo>),
        additionalMessageInfos: ([]: Array<RawMessageInfo>),
      };

      const result = await fetchConversation(conversationID, batchedUpdates);

      if (
        batchedUpdates.userIDs.size > 0 ||
        batchedUpdates.updateInfos.length > 0
      ) {
        const payload = {
          rawMessageInfos: [],
          updateInfos: batchedUpdates.updateInfos,
          userIDs:
            batchedUpdates.userIDs.size > 0
              ? Array.from(batchedUpdates.userIDs)
              : undefined,
        };

        dispatch({
          type: processFarcasterOpsActionType,
          payload,
        });
      }

      return result;
    },
    [fetchConversation, dispatch],
  );
}

function useFarcasterSync(onComplete?: () => void): { +inProgress: boolean } {
  const syncFarcasterConversations = useFarcasterConversationsSync();
  const currentUserSupportsDCs = useCurrentUserSupportsDCs();
  const farcasterDCsLoaded = useFarcasterDCsLoaded();
  const isUserLoggedIn = useSelector(isLoggedIn);
  const userDataReady = useIsUserDataReady();
  const fullyLoggedIn = isUserLoggedIn && userDataReady;
  const [inProgress, setInProgress] = React.useState(false);

  React.useEffect(() => {
    if (
      inProgress ||
      farcasterDCsLoaded !== false ||
      !fullyLoggedIn ||
      !currentUserSupportsDCs
    ) {
      return;
    }
    setInProgress(true);
    void (async () => {
      try {
        await syncFarcasterConversations(Number.POSITIVE_INFINITY);
      } finally {
        setInProgress(false);
        onComplete?.();
      }
    })();
  }, [
    currentUserSupportsDCs,
    farcasterDCsLoaded,
    fullyLoggedIn,
    inProgress,
    onComplete,
    syncFarcasterConversations,
  ]);

  return { inProgress };
}

export {
  useFarcasterConversationsSync,
  useFetchConversationWithBatching,
  useFetchConversation,
  useFetchMessagesForConversation,
  useRefreshFarcasterConversation,
  useAddNewFarcasterMessage,
  useFarcasterSync,
};
