// @flow

import * as React from 'react';
import uuid from 'uuid';

import {
  processFarcasterOpsActionType,
  type ProcessFarcasterOpsPayload,
} from './farcaster-actions.js';
import {
  type FetchFarcasterConversationResult,
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
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import { useGetCommFCUsersForFIDs } from '../../hooks/user-identities-hooks.js';
import type { GetCommFCUsersForFIDs } from '../../hooks/user-identities-hooks.js';
import { isLoggedIn } from '../../selectors/user-selectors.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import {
  messageTruncationStatus,
  defaultNumberPerThread,
} from '../../types/message-types.js';
import type {
  MemberInfoSansPermissions,
  FarcasterRawThreadInfo,
} from '../../types/minimally-encoded-thread-permissions-types';
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
import { values } from '../../utils/objects.js';
import { useDispatch, useSelector } from '../../utils/redux-utils.js';
import sleep from '../../utils/sleep.js';
import {
  conversationIDFromFarcasterThreadID,
  farcasterThreadIDFromConversationID,
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
  onProgress?: (completed: number, total: number) => void,
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

    const completedItems = Math.min(i + batchSize, items.length);
    onProgress?.(completedItems, items.length);

    // This should help with the app responsiveness
    await sleep(0);
  }

  return results;
}

type ConversationFetchResult = {
  +farcasterConversation: FarcasterConversation,
  +thread: FarcasterRawThreadInfo,
  +threadMembers: Array<MemberInfoSansPermissions>,
};
async function fetchAndProcessConversation(
  conversationID: string,
  fetchFarcasterConversation: (input: {
    conversationId: string,
  }) => Promise<?FetchFarcasterConversationResult>,
  fetchUsersByFIDs: GetCommFCUsersForFIDs,
): Promise<?ConversationFetchResult> {
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
  const threadMembers = thread.members.map(
    member =>
      ({
        ...member,
        id:
          commFCUsersForFIDs.get(member.id)?.userID ?? userIDFromFID(member.id),
      }: MemberInfoSansPermissions),
  );

  thread = {
    ...thread,
    members: threadMembers,
  };

  return { farcasterConversation, thread, threadMembers };
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
        const result = await fetchAndProcessConversation(
          conversationID,
          fetchFarcasterConversation,
          fetchUsersByFIDs,
        );

        if (!result) {
          return null;
        }

        const { farcasterConversation, thread, threadMembers } = result;

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

function useFetchConversationWithMessages(): (
  conversationID: string,
  messagesLimit: number,
  batchedUpdates: BatchedUpdates,
) => Promise<?FarcasterConversation> {
  const fetchUsersByFIDs = useGetCommFCUsersForFIDs();
  const fetchFarcasterConversation = useFetchFarcasterConversation();
  const fetchFarcasterMessages = useFetchMessagesForConversation();

  return React.useCallback(
    async (
      conversationID: string,
      messagesLimit: number,
      batchedUpdates: BatchedUpdates,
    ): Promise<?FarcasterConversation> => {
      try {
        const result = await fetchAndProcessConversation(
          conversationID,
          fetchFarcasterConversation,
          fetchUsersByFIDs,
        );

        if (!result) {
          return null;
        }

        const { farcasterConversation, thread, threadMembers } = result;

        if (threadMembers.length > 0) {
          threadMembers.forEach(member => batchedUpdates.addUserID(member.id));
        }

        const messagesResult = await fetchFarcasterMessages(
          conversationID,
          messagesLimit,
        );
        batchedUpdates.addUserIDs(messagesResult.userIDs);

        const reduxMessages = messagesResult.messages.slice(
          0,
          defaultNumberPerThread,
        );
        const dbMessages = messagesResult.messages.slice(
          defaultNumberPerThread,
        );
        const truncationStatus =
          dbMessages.length > 0
            ? messageTruncationStatus.UNCHANGED
            : messageTruncationStatus.EXHAUSTIVE;
        batchedUpdates.addAdditionalMessageInfos(dbMessages);

        const update = {
          type: updateTypes.JOIN_THREAD,
          id: uuid.v4(),
          time: thread.creationTime,
          threadInfo: thread,
          rawMessageInfos: reduxMessages,
          truncationStatus,
          rawEntryInfos: [],
        };
        batchedUpdates.addUpdateInfo(update);

        return farcasterConversation;
      } catch (e) {
        console.error(
          `Failed fetching conversation ${conversationID} with messages:`,
          e,
        );
        return null;
      }
    },
    [fetchFarcasterConversation, fetchFarcasterMessages, fetchUsersByFIDs],
  );
}

function useFetchMessagesForConversation(): (
  conversationID: string,
  messagesNumberLimit?: number,
) => Promise<{
  +messages: Array<RawMessageInfo>,
  +userIDs: Array<string>,
}> {
  const fetchFarcasterMessages = useFetchFarcasterMessages();
  const fetchUsersByFIDs = useGetCommFCUsersForFIDs();

  return React.useCallback(
    async (
      conversationID: string,
      messagesNumberLimit: number = 20,
    ): Promise<{
      +messages: Array<RawMessageInfo>,
      +userIDs: Array<string>,
    }> => {
      const result: Array<RawMessageInfo> = [];
      const userIDs: Array<string> = [];
      try {
        let cursor: ?string = null;
        let totalMessagesFetched = 0;

        do {
          const batchLimit = Math.min(
            50,
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

            userIDs.push(
              ...Array.from(fcUserInfos.entries()).map(
                ([fid, user]) => user?.userID ?? userIDFromFID(fid),
              ),
            );
            result.push(...rawMessageInfos);
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
      return {
        messages: result,
        userIDs: Array.from(new Set(userIDs)),
      };
    },
    [fetchFarcasterMessages, fetchUsersByFIDs],
  );
}

function useRefreshFarcasterConversation(): (
  conversationID: string,
) => Promise<void> {
  const fetchConversationWithMessages = useFetchConversationWithMessages();
  const dispatch = useDispatch();

  return React.useCallback(
    async (conversationID: string) => {
      const batchedUpdates = new BatchedUpdates();

      await fetchConversationWithMessages(conversationID, 20, batchedUpdates);

      if (!batchedUpdates.isEmpty()) {
        dispatch({
          type: processFarcasterOpsActionType,
          payload: batchedUpdates.getReduxPayload(),
        });
      }
    },
    [fetchConversationWithMessages, dispatch],
  );
}

function useFarcasterConversationsSync(): (
  limit: number,
  onProgress?: (completed: number, total: number) => void,
) => Promise<void> {
  const fetchFarcasterInbox = useFetchFarcasterInbox();
  const dispatch = useDispatch();
  const fetchConversationWithMessages = useFetchConversationWithMessages();
  const setFarcasterDCsLoaded = useSetFarcasterDCsLoaded();

  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  const fetchInboxes = React.useCallback(
    async (
      category?: 'archived' | 'request',
    ): Promise<$ReadOnlyArray<string>> => {
      const allConversations: Array<string> = [];
      let currentCursor = null;

      while (true) {
        try {
          let input = { limit: 50, category };
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

  const removeDeadThreads = React.useCallback(
    (conversations: $ReadOnlyArray<string>) => {
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
    },
    [dispatch, threadInfos],
  );

  return React.useCallback(
    async (
      limit: number,
      onProgress?: (completed: number, total: number) => void,
    ) => {
      try {
        const inboxResults = await Promise.all([fetchInboxes()]);
        const conversations = inboxResults.flat();

        removeDeadThreads(conversations);

        if (conversations.length === 0) {
          setFarcasterDCsLoaded(true);
          return;
        }

        const threadIDs = new Set(Object.keys(threadInfos));
        const newConversations = new Set(
          conversations.filter(
            conversationID =>
              !threadIDs.has(
                farcasterThreadIDFromConversationID(conversationID),
              ),
          ),
        );

        onProgress?.(0, conversations.length);
        await processInBatchesWithReduxBatching(
          conversations,
          FARCASTER_DATA_BATCH_SIZE,
          (conversationID, batchedUpdates) =>
            fetchConversationWithMessages(
              conversationID,
              newConversations.has(conversationID)
                ? Number.POSITIVE_INFINITY
                : limit,
              batchedUpdates,
            ),
          dispatch,
          (completed, total) => onProgress?.(completed, total),
        );

        setFarcasterDCsLoaded(true);
      } catch (e) {
        console.error('Error syncing Farcaster conversations', e);
        throw e;
      }
    },
    [
      dispatch,
      fetchConversationWithMessages,
      fetchInboxes,
      removeDeadThreads,
      setFarcasterDCsLoaded,
      threadInfos,
    ],
  );
}

function useAddNewFarcasterMessage(): FarcasterMessage => Promise<void> {
  const dispatch = useDispatch();
  const fetchUsersByFIDs = useGetCommFCUsersForFIDs();
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const fetchMessage = useGetLatestMessageEdit();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const fetchConversationWithMessages = useFetchConversationWithMessages();
  const currentlyFetchedConversations = React.useRef<Set<string>>(new Set());

  return React.useCallback(
    async (farcasterMessage: FarcasterMessage) => {
      if (
        !threadInfos[
          farcasterThreadIDFromConversationID(farcasterMessage.conversationId)
        ] &&
        !currentlyFetchedConversations.current.has(
          farcasterMessage.conversationId,
        )
      ) {
        currentlyFetchedConversations.current.add(
          farcasterMessage.conversationId,
        );
        const updates = new BatchedUpdates();
        await fetchConversationWithMessages(
          farcasterMessage.conversationId,
          Number.POSITIVE_INFINITY,
          updates,
        );
        dispatch({
          type: processFarcasterOpsActionType,
          payload: updates.getReduxPayload(),
        });
        currentlyFetchedConversations.current.delete(
          farcasterMessage.conversationId,
        );
        return;
      }

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

      const updates: Array<ClientUpdateInfo> = [];
      const message = rawMessageInfos[0];
      if (message && message.id && viewerID !== message.creatorID) {
        const dbMessage = await fetchMessage(message.id);
        if (!dbMessage) {
          updates.push({
            id: uuid.v4(),
            type: updateTypes.UPDATE_THREAD_READ_STATUS,
            time: message.time,
            threadID: message.threadID,
            unread: true,
          });
        }
      }

      dispatch({
        type: processFarcasterOpsActionType,
        payload: { rawMessageInfos, updateInfos: updates, userIDs },
      });
    },
    [
      dispatch,
      fetchConversationWithMessages,
      fetchMessage,
      fetchUsersByFIDs,
      threadInfos,
      viewerID,
    ],
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

function useFarcasterSync(onComplete?: () => void): {
  +inProgress: boolean,
  +progress: ?{
    completed: number,
    total: number,
  },
} {
  const syncFarcasterConversations = useFarcasterConversationsSync();
  const currentUserSupportsDCs = useCurrentUserSupportsDCs();
  const farcasterDCsLoaded = useFarcasterDCsLoaded();
  const isUserLoggedIn = useSelector(isLoggedIn);
  const userDataReady = useIsUserDataReady();
  const fullyLoggedIn = isUserLoggedIn && userDataReady;
  const [inProgress, setInProgress] = React.useState(false);
  const [progress, setProgress] = React.useState<?{
    completed: number,
    total: number,
  }>(null);

  const handleProgress = React.useCallback(
    (completed: number, total: number) =>
      setProgress({
        completed,
        total,
      }),
    [],
  );

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
    setProgress(null);
    void (async () => {
      try {
        await syncFarcasterConversations(
          Number.POSITIVE_INFINITY,
          handleProgress,
        );
      } finally {
        setInProgress(false);
        setProgress(null);
        onComplete?.();
      }
    })();
  }, [
    currentUserSupportsDCs,
    farcasterDCsLoaded,
    fullyLoggedIn,
    inProgress,
    onComplete,
    handleProgress,
    syncFarcasterConversations,
  ]);

  return { inProgress, progress };
}

export {
  useFarcasterConversationsSync,
  useFetchConversationWithBatching,
  useFetchConversationWithMessages,
  useFetchConversation,
  useFetchMessagesForConversation,
  useRefreshFarcasterConversation,
  useAddNewFarcasterMessage,
  useFarcasterSync,
};
