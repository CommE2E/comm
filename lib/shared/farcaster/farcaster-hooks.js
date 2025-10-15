// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  processFarcasterOpsActionType,
  type ProcessFarcasterOpsPayload,
} from './farcaster-actions.js';
import {
  type FetchFarcasterConversationInput,
  type FetchFarcasterConversationInvitesInput,
  type FetchFarcasterConversationInvitesResult,
  type FetchFarcasterConversationResult,
  notAuthorizedToViewPendingInvitesError,
  notAuthorizedToAccessConversationError,
  useFetchFarcasterConversation,
  useFetchFarcasterConversationInvites,
  useFetchFarcasterInbox,
  useFetchFarcasterMessages,
} from './farcaster-api.js';
import type {
  FarcasterConversation,
  FarcasterInboxConversation,
} from './farcaster-conversation-types.js';
import { useFarcasterMessageFetching } from './farcaster-message-fetching-context.js';
import {
  type FarcasterMessage,
  farcasterMessageValidator,
} from './farcaster-messages-types.js';
import {
  type AddLogCallback,
  logTypes,
  useDebugLogs,
} from '../../components/debug-logs-context.js';
import { useIsUserDataReady } from '../../hooks/backup-hooks.js';
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import { useGetCommFCUsersForFIDs } from '../../hooks/user-identities-hooks.js';
import type { GetCommFCUsersForFIDs } from '../../hooks/user-identities-hooks.js';
import { isLoggedIn } from '../../selectors/user-selectors.js';
import { useTunnelbroker } from '../../tunnelbroker/tunnelbroker-context.js';
import { messageTypes } from '../../types/message-types-enum.js';
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
import type { ThreadType } from '../../types/thread-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { extractFarcasterIDsFromPayload } from '../../utils/conversion-utils.js';
import { convertFarcasterMessageToCommMessages } from '../../utils/convert-farcaster-message-to-comm-messages.js';
import {
  createFarcasterRawThreadInfo,
  createUpdatedThread,
} from '../../utils/create-farcaster-raw-thread-info.js';
import { getMessageForException } from '../../utils/errors.js';
import {
  useCurrentUserFID,
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
  isFarcasterPersonalConversationID,
  userIDFromFID,
} from '../id-utils.js';
import { threadSpecs } from '../threads/thread-specs.js';

const FARCASTER_DATA_BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MAX_BATCH_MESSAGE_SIZE = 500000;

class BatchedUpdates {
  userIDs: Set<string>;
  updateInfos: Array<ClientUpdateInfo>;
  messageInfos: Array<RawMessageInfo>;
  additionalMessageInfos: Array<RawMessageInfo>;
  estimatedSize: number;

  constructor() {
    this.userIDs = new Set<string>();
    this.updateInfos = ([]: Array<ClientUpdateInfo>);
    this.messageInfos = ([]: Array<RawMessageInfo>);
    this.additionalMessageInfos = ([]: Array<RawMessageInfo>);
    this.estimatedSize = 0;
  }

  estimateMessageSize(messageInfo: RawMessageInfo): number {
    if (messageInfo.type === messageTypes.TEXT && messageInfo.text) {
      return messageInfo.text.length;
    }
    return 0;
  }

  addUserID(userID: string): void {
    this.userIDs.add(userID);
  }

  addUserIDs(userIDs: Array<string>): void {
    userIDs.forEach(userID => this.userIDs.add(userID));
  }

  addUpdateInfo(updateInfo: ClientUpdateInfo): void {
    this.updateInfos.push(updateInfo);
    if (
      updateInfo.type === updateTypes.JOIN_THREAD &&
      updateInfo.rawMessageInfos
    ) {
      for (const messageInfo of updateInfo.rawMessageInfos) {
        this.estimatedSize += this.estimateMessageSize(messageInfo);
      }
    }
  }

  addMessageInfo(messageInfo: RawMessageInfo): void {
    this.messageInfos.push(messageInfo);
    this.estimatedSize += this.estimateMessageSize(messageInfo);
  }

  addMessageInfos(messageInfos: Array<RawMessageInfo>): void {
    this.messageInfos.push(...messageInfos);
    for (const messageInfo of messageInfos) {
      this.estimatedSize += this.estimateMessageSize(messageInfo);
    }
  }

  addAdditionalMessageInfo(messageInfo: RawMessageInfo): void {
    this.additionalMessageInfos.push(messageInfo);
    this.estimatedSize += this.estimateMessageSize(messageInfo);
  }

  addAdditionalMessageInfos(messageInfos: Array<RawMessageInfo>): void {
    this.additionalMessageInfos.push(...messageInfos);
    for (const messageInfo of messageInfos) {
      this.estimatedSize += this.estimateMessageSize(messageInfo);
    }
  }

  isEmpty(): boolean {
    return (
      this.userIDs.size === 0 &&
      this.updateInfos.length === 0 &&
      this.messageInfos.length === 0 &&
      this.additionalMessageInfos.length === 0
    );
  }

  getEstimatedSize(): number {
    return this.estimatedSize;
  }

  trimToSize(maxSize: number): BatchedUpdates {
    const overflow = new BatchedUpdates();

    if (this.estimatedSize <= maxSize) {
      return overflow;
    }

    const overflowAdditionalMessages = [];
    while (
      this.additionalMessageInfos.length > 0 &&
      this.estimatedSize > maxSize
    ) {
      const message = this.additionalMessageInfos.pop();
      if (message) {
        const messageSize = this.estimateMessageSize(message);
        this.estimatedSize -= messageSize;
        overflowAdditionalMessages.push(message);
      }
    }

    const overflowMessages = [];
    // The size of a message is bounded, so it shouldn't matter in practice,
    // but just in case, we should keep at least one message in a batch
    while (this.messageInfos.length > 1 && this.estimatedSize > maxSize) {
      const message = this.messageInfos.pop();
      if (message) {
        const messageSize = this.estimateMessageSize(message);
        this.estimatedSize -= messageSize;
        overflowMessages.push(message);
      }
    }

    // We're popping from the end of the arrays, so we need to reverse them
    overflowAdditionalMessages.reverse();
    overflowMessages.reverse();
    overflow.addAdditionalMessageInfos(overflowAdditionalMessages);
    overflow.addMessageInfos(overflowMessages);

    return overflow;
  }

  merge(other: BatchedUpdates): void {
    other.userIDs.forEach(userID => this.userIDs.add(userID));
    this.updateInfos.push(...other.updateInfos);
    this.messageInfos.push(...other.messageInfos);
    this.additionalMessageInfos.push(...other.additionalMessageInfos);
    this.estimatedSize += other.estimatedSize;
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

const notRetryableErrors = [
  notAuthorizedToViewPendingInvitesError,
  notAuthorizedToAccessConversationError,
];

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS,
  addLog?: AddLogCallback,
  operationName?: string,
): Promise<T> {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (addLog && operationName) {
        const message = getMessageForException(error);
        const errorIsNotRetryable = notRetryableErrors.some(notRetryableError =>
          message?.includes(notRetryableError),
        );
        if (errorIsNotRetryable) {
          addLog(
            `Farcaster: Retry attempt ${attempt}/${maxRetries + 1} failed for ${operationName}`,
            `This isn't a retryable error, so giving up: ${JSON.stringify({
              attempt,
              maxRetries,
              error: message,
            })}`,
            new Set([logTypes.FARCASTER]),
          );
          throw error;
        }
        addLog(
          `Farcaster: Retry attempt ${attempt}/${maxRetries + 1} failed for ${operationName}`,
          JSON.stringify({
            attempt,
            maxRetries,
            error: message,
          }),
          new Set([logTypes.FARCASTER]),
        );
      }

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
  addLog?: AddLogCallback,
): Promise<Array<R>> {
  const results: Array<R> = [];
  let failedItemsCount = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchPromises = batch.map(async item => {
      try {
        const itemBatchedUpdates = new BatchedUpdates();
        const result = await processor(item, itemBatchedUpdates);
        return { result, updates: itemBatchedUpdates };
      } catch (error) {
        console.log('Error processing item:', item, 'Error:', error);
        if (addLog) {
          addLog(
            'Farcaster: Failed to process item in batch',
            JSON.stringify({
              item: typeof item === 'string' ? item : 'complex_item',
              batchIndex: i,
              error: getMessageForException(error),
            }),
            new Set([logTypes.FARCASTER]),
          );
        }
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);

    let batchedUpdates = new BatchedUpdates();
    let nullResultsInBatch = 0;

    for (const itemResult of batchResults) {
      if (itemResult) {
        results.push(itemResult.result);
        batchedUpdates.merge(itemResult.updates);

        while (batchedUpdates.getEstimatedSize() > MAX_BATCH_MESSAGE_SIZE) {
          const overflow = batchedUpdates.trimToSize(MAX_BATCH_MESSAGE_SIZE);

          dispatch({
            type: processFarcasterOpsActionType,
            payload: batchedUpdates.getReduxPayload(),
          });
          batchedUpdates = overflow;
        }
      } else {
        nullResultsInBatch++;
        failedItemsCount++;
      }
    }

    if (nullResultsInBatch > 0 && addLog) {
      addLog(
        'Farcaster: Some items in batch returned null results',
        JSON.stringify({
          nullCount: nullResultsInBatch,
          batchSize: batch.length,
          batchIndex: i,
        }),
        new Set([logTypes.FARCASTER]),
      );
    }

    if (!batchedUpdates.isEmpty()) {
      dispatch({
        type: processFarcasterOpsActionType,
        payload: batchedUpdates.getReduxPayload(),
      });
    }

    const completedItems = Math.min(i + batchSize, items.length);
    onProgress?.(completedItems, items.length);

    // This should help with the app responsiveness
    await sleep(0);
  }

  if (failedItemsCount > 0 && addLog) {
    addLog(
      'Farcaster: Total failed items in processing',
      JSON.stringify({
        failedCount: failedItemsCount,
        totalCount: items.length,
        successRate:
          (((items.length - failedItemsCount) / items.length) * 100).toFixed(
            2,
          ) + '%',
      }),
      new Set([logTypes.FARCASTER]),
    );
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
  fetchFarcasterConversation: (
    input: FetchFarcasterConversationInput,
  ) => Promise<FetchFarcasterConversationResult>,
  fetchFarcasterConversationInvites: (
    input: FetchFarcasterConversationInvitesInput,
  ) => Promise<FetchFarcasterConversationInvitesResult>,
  fetchUsersByFIDs: GetCommFCUsersForFIDs,
  addLog?: AddLogCallback,
): Promise<?ConversationFetchResult> {
  const conversationResultPromise = withRetry(
    () =>
      fetchFarcasterConversation({
        conversationId: conversationID,
      }),
    MAX_RETRIES,
    RETRY_DELAY_MS,
    addLog,
    `fetchConversation(${conversationID})`,
  );

  const fetchFarcasterInvites = async () => {
    try {
      return await fetchFarcasterConversationInvites({
        conversationId: conversationID,
      });
    } catch (error) {
      const messageForException = getMessageForException(error);
      if (
        messageForException?.includes(notAuthorizedToViewPendingInvitesError)
      ) {
        // This is normal for many Farcaster group conversations
        return null;
      }
      throw error;
    }
  };

  const conversationInviteesResultPromise: Promise<?FetchFarcasterConversationInvitesResult> =
    (async () => {
      if (isFarcasterPersonalConversationID(conversationID)) {
        // Personal conversations don't have invites
        return null;
      }
      try {
        return await withRetry(
          fetchFarcasterInvites,
          MAX_RETRIES,
          RETRY_DELAY_MS,
        );
      } catch (error) {
        // Errors in fetching invites should not fail the entire conversation
        return null;
      }
    })();

  const [conversationResult, conversationInviteesResult] = await Promise.all([
    conversationResultPromise,
    conversationInviteesResultPromise,
  ]);

  if (!conversationResult) {
    if (addLog) {
      addLog(
        'Farcaster: Conversation result is null after retries',
        JSON.stringify({ conversationID }),
        new Set([logTypes.FARCASTER]),
      );
    }
    return null;
  }

  if (!conversationResult.result?.conversation) {
    if (addLog) {
      addLog(
        'Farcaster: Invalid conversation result structure',
        JSON.stringify({
          conversationID,
          hasResult: !!conversationResult.result,
          hasConversation: !!conversationResult.result?.conversation,
        }),
        new Set([logTypes.FARCASTER]),
      );
    }
    return null;
  }

  const farcasterConversation = conversationResult.result.conversation;
  let thread = createFarcasterRawThreadInfo(
    farcasterConversation,
    conversationInviteesResult?.result?.invites ?? [],
  );
  const fids = thread.members.map(member => member.id);
  const commFCUsersForFIDs = await fetchUsersByFIDs(fids);

  if (commFCUsersForFIDs.size !== fids.length && addLog) {
    addLog(
      'Farcaster: FID to user mapping incomplete',
      JSON.stringify({
        conversationID,
        requestedFIDs: fids.length,
        resolvedUsers: commFCUsersForFIDs.size,
        missingFIDs: fids.filter(fid => !commFCUsersForFIDs.has(fid)),
      }),
      new Set([logTypes.FARCASTER]),
    );
  }

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

  return {
    farcasterConversation,
    thread,
    threadMembers,
  };
}

function useFetchConversationWithBatching(): (
  conversationID: string,
  batchedUpdates: BatchedUpdates,
) => Promise<?FarcasterConversation> {
  const fetchUsersByFIDs = useGetCommFCUsersForFIDs();
  const fetchFarcasterConversation = useFetchFarcasterConversation();
  const fetchFarcasterConversationInvites =
    useFetchFarcasterConversationInvites();
  const { addLog } = useDebugLogs();

  return React.useCallback(
    async (
      conversationID: string,
      batchedUpdates: BatchedUpdates,
    ): Promise<?FarcasterConversation> => {
      try {
        const result = await fetchAndProcessConversation(
          conversationID,
          fetchFarcasterConversation,
          fetchFarcasterConversationInvites,
          fetchUsersByFIDs,
          addLog,
        );

        if (!result) {
          addLog(
            'Farcaster: No result while fetching conversation',
            JSON.stringify({ conversationID }),
            new Set([logTypes.FARCASTER]),
          );
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

        if (threadMembers.length === 0) {
          addLog(
            'Farcaster: No thread members found for conversation',
            JSON.stringify({ conversationID }),
            new Set([logTypes.FARCASTER]),
          );
        } else {
          threadMembers.forEach(member => batchedUpdates.addUserID(member.id));
        }
        batchedUpdates.addUpdateInfo(update);

        return farcasterConversation;
      } catch (e) {
        addLog(
          'Farcaster: Failed to fetch conversation',
          JSON.stringify({
            conversationID,
            error: getMessageForException(e),
          }),
          new Set([logTypes.FARCASTER]),
        );
        return null;
      }
    },
    [
      addLog,
      fetchFarcasterConversation,
      fetchFarcasterConversationInvites,
      fetchUsersByFIDs,
    ],
  );
}

function useFetchConversationWithMessages(): (
  conversationID: string,
  messagesLimit: number,
  batchedUpdates: BatchedUpdates,
) => Promise<?FarcasterConversation> {
  const fetchUsersByFIDs = useGetCommFCUsersForFIDs();
  const fetchFarcasterConversation = useFetchFarcasterConversation();
  const fetchFarcasterConversationInvites =
    useFetchFarcasterConversationInvites();
  const fetchFarcasterMessages = useFetchMessagesForConversation();
  const { addLog } = useDebugLogs();

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
          fetchFarcasterConversationInvites,
          fetchUsersByFIDs,
          addLog,
        );

        if (!result) {
          addLog(
            'Farcaster: No result while fetching conversation with messages',
            JSON.stringify({ conversationID, messagesLimit }),
            new Set([logTypes.FARCASTER]),
          );
          return null;
        }

        const { farcasterConversation, thread, threadMembers } = result;

        if (threadMembers.length === 0) {
          addLog(
            'Farcaster: No thread members in conversation with messages',
            JSON.stringify({ conversationID }),
            new Set([logTypes.FARCASTER]),
          );
        } else {
          threadMembers.forEach(member => batchedUpdates.addUserID(member.id));
        }

        const messagesResult = await fetchFarcasterMessages(
          conversationID,
          messagesLimit,
        );

        if (messagesResult.messages.length === 0) {
          addLog(
            'Farcaster: No messages fetched for conversation',
            JSON.stringify({ conversationID, messagesLimit }),
            new Set([logTypes.FARCASTER]),
          );
        }

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
        addLog(
          'Farcaster: Failed to fetch conversation with messages',
          JSON.stringify({
            conversationID,
            messagesLimit,
            error: getMessageForException(e),
          }),
          new Set([logTypes.FARCASTER]),
        );
        return null;
      }
    },
    [
      addLog,
      fetchFarcasterConversation,
      fetchFarcasterMessages,
      fetchFarcasterConversationInvites,
      fetchUsersByFIDs,
    ],
  );
}

function useFetchMessagesForConversation(): (
  conversationID: string,
  messagesNumberLimit?: number,
  cursor?: ?string,
) => Promise<{
  +messages: Array<RawMessageInfo>,
  +userIDs: Array<string>,
  +newCursor?: ?string,
}> {
  const fetchFarcasterMessages = useFetchFarcasterMessages();
  const fetchUsersByFIDs = useGetCommFCUsersForFIDs();
  const { addLog } = useDebugLogs();

  return React.useCallback(
    async (
      conversationID: string,
      messagesNumberLimit: number = 20,
      cursor?: ?string,
    ): Promise<{
      +messages: Array<RawMessageInfo>,
      +userIDs: Array<string>,
      +newCursor?: ?string,
    }> => {
      const result: Array<RawMessageInfo> = [];
      const userIDs: Array<string> = [];
      const messageIDs = new Set<string>();
      let batchNumber = 0;

      try {
        let totalMessagesFetched = 0;

        do {
          batchNumber++;
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
            addLog,
            `fetchMessages(${conversationID}, batch=${batchNumber})`,
          );

          if (messagesResult) {
            const farcasterMessages = messagesResult.result.messages;

            if (farcasterMessages.length === 0) {
              addLog(
                'Farcaster: Empty message batch received',
                JSON.stringify({
                  conversationID,
                  batchNumber,
                  hasCursor: !!cursor,
                }),
                new Set([logTypes.FARCASTER]),
              );
              break;
            }

            const prevMessageCount = messageIDs.size;
            messageIDs.add(
              ...farcasterMessages.map(message => message.messageId),
            );

            if (prevMessageCount === messageIDs.size) {
              addLog(
                'Farcaster: Duplicate message batch detected (breaking loop)',
                JSON.stringify({
                  conversationID,
                  batchNumber,
                }),
                new Set([logTypes.FARCASTER]),
              );
              break;
            }

            const userFIDs = farcasterMessages.flatMap(message =>
              extractFarcasterIDsFromPayload(
                farcasterMessageValidator,
                message,
              ),
            );
            const fcUserInfos = await fetchUsersByFIDs(userFIDs);

            const rawMessageInfos = farcasterMessages.flatMap(message =>
              convertFarcasterMessageToCommMessages(
                message,
                fcUserInfos,
                addLog,
              ),
            );

            if (rawMessageInfos.length < farcasterMessages.length) {
              addLog(
                'Farcaster: Some messages failed to convert',
                JSON.stringify({
                  conversationID,
                  farcasterMessages: farcasterMessages.length,
                  convertedMessages: rawMessageInfos.length,
                  batchNumber,
                }),
                new Set([logTypes.FARCASTER]),
              );
            }

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
        addLog(
          'Farcaster: Failed to fetch messages',
          JSON.stringify({
            conversationID,
            messagesNumberLimit,
            cursor,
            batchNumber,
            error: getMessageForException(e),
          }),
          new Set([logTypes.FARCASTER]),
        );
      }
      return {
        messages: result,
        userIDs: Array.from(new Set(userIDs)),
        newCursor: cursor,
      };
    },
    [addLog, fetchFarcasterMessages, fetchUsersByFIDs],
  );
}

function useRefreshFarcasterConversation(): (
  conversationID: string,
  messagesLimit?: number,
) => Promise<void> {
  const fetchConversationWithMessages = useFetchConversationWithMessages();
  const dispatch = useDispatch();

  return React.useCallback(
    async (conversationID: string, messagesLimit?: number) => {
      const batchedUpdates = new BatchedUpdates();

      await fetchConversationWithMessages(
        conversationID,
        messagesLimit ?? 20,
        batchedUpdates,
      );

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

function useFetchInboxes(): (category?: 'archived' | 'request') => Promise<{
  +conversations: $ReadOnlyArray<FarcasterInboxConversation>,
  +fetchSuccessful: boolean,
}> {
  const fetchFarcasterInbox = useFetchFarcasterInbox();
  const { addLog } = useDebugLogs();

  return React.useCallback(
    async (
      category?: 'archived' | 'request',
    ): Promise<{
      +conversations: $ReadOnlyArray<FarcasterInboxConversation>,
      +fetchSuccessful: boolean,
    }> => {
      const allConversations: Array<FarcasterInboxConversation> = [];
      let currentCursor = null;
      let pageNumber = 0;
      let fetchSuccessful = true;

      while (true) {
        pageNumber++;
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
            addLog,
            `fetchInbox(${category || 'main'}, page=${pageNumber})`,
          );

          if (result.conversations.length === 0) {
            addLog(
              'Farcaster: Empty inbox page received',
              JSON.stringify({
                category: category || 'main',
                pageNumber,
                hasNextCursor: !!next?.cursor,
              }),
              new Set([logTypes.FARCASTER]),
            );
          }

          allConversations.push(...result.conversations);

          if (next?.cursor) {
            currentCursor = next.cursor;
          } else {
            break;
          }
        } catch (e) {
          addLog(
            'Farcaster: Failed to fetch inbox',
            JSON.stringify({
              category: category || 'main',
              cursor: currentCursor,
              pageNumber,
              conversationsFetchedSoFar: allConversations.length,
              error: getMessageForException(e),
            }),
            new Set([logTypes.FARCASTER]),
          );
          fetchSuccessful = false;
          break;
        }
      }

      return { conversations: allConversations, fetchSuccessful };
    },
    [addLog, fetchFarcasterInbox],
  );
}

function useFetchInboxIDs(): (category?: 'archived' | 'request') => Promise<{
  +conversationIDs: $ReadOnlyArray<string>,
  +fetchSuccessful: boolean,
}> {
  const fetchInboxes = useFetchInboxes();
  return React.useCallback(
    async (category?: 'archived' | 'request') => {
      const { conversations, fetchSuccessful } = await fetchInboxes(category);
      return {
        conversationIDs: conversations.map(
          conversation => conversation.conversationId,
        ),
        fetchSuccessful,
      };
    },
    [fetchInboxes],
  );
}

function useRemoveDeadThreads(): (
  conversations: $ReadOnlyArray<string>,
) => void {
  const dispatch = useDispatch();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const { addLog } = useDebugLogs();

  return React.useCallback(
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

      addLog(
        'Farcaster: Removing dead threads',
        JSON.stringify({
          removedThreads: updateInfos.map(updateInfo => updateInfo.threadID),
        }),
        new Set([logTypes.FARCASTER]),
      );

      dispatch({
        type: processFarcasterOpsActionType,
        payload: {
          rawMessageInfos: [],
          updateInfos,
        },
      });
    },
    [addLog, dispatch, threadInfos],
  );
}

function useFarcasterConversationsSync(): (
  onProgress?: (completed: number, total: number) => void,
) => Promise<void> {
  const dispatch = useDispatch();
  const fetchConversationWithMessages = useFetchConversationWithMessages();
  const setFarcasterDCsLoaded = useSetFarcasterDCsLoaded();
  const { addLog } = useDebugLogs();
  const fetchInboxes = useFetchInboxIDs();
  const removeDeadThreads = useRemoveDeadThreads();

  return React.useCallback(
    async (onProgress?: (completed: number, total: number) => void) => {
      try {
        const inboxResults = await Promise.all([
          fetchInboxes(),
          fetchInboxes('request'),
          fetchInboxes('archived'),
        ]);
        const allFetchSuccessful = inboxResults.every(
          result => result.fetchSuccessful,
        );
        const conversations = inboxResults.flatMap(
          result => result.conversationIDs,
        );

        if (allFetchSuccessful) {
          removeDeadThreads(conversations);
        }

        if (conversations.length === 0) {
          addLog(
            'Farcaster: No conversations to sync',
            JSON.stringify({}),
            new Set([logTypes.FARCASTER]),
          );
          setFarcasterDCsLoaded(true);
          return;
        }

        onProgress?.(0, conversations.length);
        await processInBatchesWithReduxBatching(
          conversations,
          FARCASTER_DATA_BATCH_SIZE,
          (conversationID, batchedUpdates) =>
            fetchConversationWithMessages(
              conversationID,
              Number.POSITIVE_INFINITY,
              batchedUpdates,
            ),
          dispatch,
          (completed, total) => onProgress?.(completed, total),
          addLog,
        );

        setFarcasterDCsLoaded(true);
      } catch (e) {
        addLog(
          'Farcaster: Failed to sync conversations (full sync)',
          JSON.stringify({
            error: getMessageForException(e),
          }),
          new Set([logTypes.FARCASTER]),
        );
        throw e;
      }
    },
    [
      addLog,
      dispatch,
      fetchConversationWithMessages,
      fetchInboxes,
      removeDeadThreads,
      setFarcasterDCsLoaded,
    ],
  );
}

function useLightweightFarcasterConversationsSync(): () => Promise<void> {
  const dispatch = useDispatch();
  const fetchConversationWithMessages = useFetchConversationWithMessages();
  const { addLog } = useDebugLogs();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const fetchInboxes = useFetchInboxes();
  const removeDeadThreads = useRemoveDeadThreads();
  const currentUserFID = useCurrentUserFID();
  const auxUserStore = useSelector(state => state.auxUserStore);

  return React.useCallback(async () => {
    try {
      invariant(currentUserFID, 'currentUserFID is not defined');
      const inboxResults = await Promise.all([
        fetchInboxes(),
        fetchInboxes('request'),
        fetchInboxes('archived'),
      ]);
      const allFetchSuccessful = inboxResults.every(
        result => result.fetchSuccessful,
      );
      const conversations = inboxResults.flatMap(
        result => result.conversations,
      );
      const conversationIDs = conversations.map(
        conversation => conversation.conversationId,
      );

      if (allFetchSuccessful) {
        removeDeadThreads(conversationIDs);
      }

      const threadIDs = new Set(Object.keys(threadInfos));
      const newConversationIDs = [];
      const existingConversationIDs = [];

      for (const conversationID of conversationIDs) {
        if (
          threadIDs.has(farcasterThreadIDFromConversationID(conversationID))
        ) {
          existingConversationIDs.push(conversationID);
        } else {
          newConversationIDs.push(conversationID);
        }
      }

      const updateResults = conversations
        .map(conversation => {
          const threadID = farcasterThreadIDFromConversationID(
            conversation.conversationId,
          );
          const thread = threadInfos[threadID];
          if (thread && thread.farcaster) {
            return createUpdatedThread(
              thread,
              conversation,
              currentUserFID,
              auxUserStore,
            );
          }
          return null;
        })
        .filter(Boolean);

      const updates = updateResults
        .map(result =>
          result && result.result === 'updated' ? result.threadInfo : null,
        )
        .filter(Boolean)
        .map(thread => ({
          type: updateTypes.UPDATE_THREAD,
          time: thread.creationTime,
          threadInfo: thread,
          id: uuid.v4(),
        }));
      dispatch({
        type: processFarcasterOpsActionType,
        payload: {
          rawMessageInfos: [],
          updateInfos: updates,
        },
      });

      const needRefetch = updateResults
        .map(result =>
          result && result.result === 'refetch' ? result.conversationID : null,
        )
        .filter(Boolean);

      if (needRefetch.length > 0) {
        await processInBatchesWithReduxBatching(
          needRefetch,
          FARCASTER_DATA_BATCH_SIZE,
          (conversationID, batchedUpdates) =>
            fetchConversationWithMessages(conversationID, 0, batchedUpdates),
          dispatch,
          undefined,
          addLog,
        );
      }

      if (newConversationIDs.length > 0) {
        await processInBatchesWithReduxBatching(
          newConversationIDs,
          FARCASTER_DATA_BATCH_SIZE,
          (conversationID, batchedUpdates) =>
            fetchConversationWithMessages(
              conversationID,
              Number.POSITIVE_INFINITY,
              batchedUpdates,
            ),
          dispatch,
          undefined,
          addLog,
        );
      }
    } catch (e) {
      addLog(
        'Farcaster: Failed to sync conversations (lightweight)',
        JSON.stringify({
          error: getMessageForException(e),
        }),
        new Set([logTypes.FARCASTER]),
      );
      throw e;
    }
  }, [
    currentUserFID,
    fetchInboxes,
    removeDeadThreads,
    threadInfos,
    dispatch,
    auxUserStore,
    addLog,
    fetchConversationWithMessages,
  ]);
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
  const { addLog } = useDebugLogs();

  const fetchConversation = React.useCallback(
    async (farcasterMessage: FarcasterMessage, withMessages: boolean) => {
      currentlyFetchedConversations.current.add(
        farcasterMessage.conversationId,
      );
      const updates = new BatchedUpdates();
      await fetchConversationWithMessages(
        farcasterMessage.conversationId,
        withMessages ? Number.POSITIVE_INFINITY : 0,
        updates,
      );
      dispatch({
        type: processFarcasterOpsActionType,
        payload: updates.getReduxPayload(),
      });
      currentlyFetchedConversations.current.delete(
        farcasterMessage.conversationId,
      );
    },
    [dispatch, fetchConversationWithMessages],
  );

  return React.useCallback(
    async (farcasterMessage: FarcasterMessage) => {
      const threadID = farcasterThreadIDFromConversationID(
        farcasterMessage.conversationId,
      );

      if (
        !threadInfos[threadID] &&
        !currentlyFetchedConversations.current.has(
          farcasterMessage.conversationId,
        )
      ) {
        await fetchConversation(farcasterMessage, true);
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
        addLog,
      );

      if (rawMessageInfos.length === 0) {
        addLog(
          'Farcaster: Failed to convert new message to Comm messages',
          JSON.stringify({
            conversationID: farcasterMessage.conversationId,
            messageID: farcasterMessage.messageId,
          }),
          new Set([logTypes.FARCASTER]),
        );
      }

      const isMembershipAddition = rawMessageInfos.some(
        msg =>
          msg.type === messageTypes.ADD_MEMBERS ||
          msg.type === messageTypes.REMOVE_MEMBERS ||
          msg.type === messageTypes.CHANGE_ROLE ||
          msg.type === messageTypes.LEAVE_THREAD ||
          msg.type === messageTypes.JOIN_THREAD,
      );

      if (isMembershipAddition) {
        await fetchConversation(farcasterMessage, false);
      }

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
      addLog,
      dispatch,
      fetchConversation,
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
        await syncFarcasterConversations(handleProgress);
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

function useFarcasterThreadRefresher(
  activeChatThreadID: ?string,
  threadType: ?ThreadType,
  appFocused: boolean,
): void {
  const prevActiveThreadID = React.useRef<?string>(null);
  const prevAppFocused = React.useRef(appFocused);
  const farcasterRefreshConversation = useRefreshFarcasterConversation();
  const farcasterMessageFetching = useFarcasterMessageFetching();

  React.useEffect(() => {
    if (
      threadType &&
      activeChatThreadID &&
      (prevActiveThreadID.current !== activeChatThreadID ||
        (appFocused && !prevAppFocused.current))
    ) {
      threadSpecs[threadType].protocol().onOpenThread?.(
        { threadID: activeChatThreadID },
        {
          farcasterRefreshConversation,
          farcasterMessageFetching,
        },
      );
    }
    prevActiveThreadID.current = activeChatThreadID;
    prevAppFocused.current = appFocused;
  }, [
    activeChatThreadID,
    appFocused,
    farcasterMessageFetching,
    farcasterRefreshConversation,
    threadType,
  ]);
}

function useLightweightSyncOnAppStart() {
  const isUserLoggedIn = useSelector(isLoggedIn);
  const userDataReady = useIsUserDataReady();
  const fullyLoggedIn = isUserLoggedIn && userDataReady;
  const currentUserSupportsDCs = useCurrentUserSupportsDCs();
  const farcasterDCsLoaded = useFarcasterDCsLoaded();
  const lightweightSync = useLightweightFarcasterConversationsSync();
  const { socketState } = useTunnelbroker();
  const started = React.useRef(false);

  React.useEffect(() => {
    // We're waiting for the state to be ready
    if (
      started.current ||
      !fullyLoggedIn ||
      !currentUserSupportsDCs ||
      !socketState.isAuthorized
    ) {
      return;
    }
    started.current = true;
    // If we're here, it means that the full sync is not yet done. In that
    // case, we don't want to perform the lightweight sync during this run
    // of the app.
    if (!farcasterDCsLoaded) {
      return;
    }
    void lightweightSync();
  }, [
    currentUserSupportsDCs,
    farcasterDCsLoaded,
    fullyLoggedIn,
    lightweightSync,
    socketState.isAuthorized,
  ]);
}

function useHandleFarcasterInboxStatus(): (
  unreadConversationIds: $ReadOnlyArray<string>,
  readConversationIds: $ReadOnlyArray<string>,
) => Promise<void> {
  const dispatch = useDispatch();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const fetchConversationWithBatching = useFetchConversationWithBatching();
  const { addLog } = useDebugLogs();
  const currentUserSupportsDCs = useCurrentUserSupportsDCs();
  const farcasterDCsLoaded = useFarcasterDCsLoaded();

  return React.useCallback(
    async (
      unreadConversationIds: $ReadOnlyArray<string>,
      readConversationIds: $ReadOnlyArray<string>,
    ) => {
      if (!currentUserSupportsDCs) {
        return;
      }
      try {
        const allConversationIds = [
          ...unreadConversationIds,
          ...readConversationIds,
        ];

        const unreadStatusMap = new Map<string, boolean>();
        unreadConversationIds.forEach(id => unreadStatusMap.set(id, true));
        readConversationIds.forEach(id => unreadStatusMap.set(id, false));

        const updateInfos: Array<ClientUpdateInfo> = [];
        const unknownConversationIds: Array<string> = [];

        for (const conversationID of allConversationIds) {
          const threadID = farcasterThreadIDFromConversationID(conversationID);
          const threadInfo = threadInfos[threadID];
          const expectedUnreadStatus = unreadStatusMap.get(conversationID);

          if (!threadInfo) {
            unknownConversationIds.push(conversationID);
          } else if (
            threadInfo.currentUser.unread !== expectedUnreadStatus &&
            expectedUnreadStatus !== undefined
          ) {
            updateInfos.push({
              id: uuid.v4(),
              type: updateTypes.UPDATE_THREAD_READ_STATUS,
              time: Date.now(),
              threadID,
              unread: expectedUnreadStatus,
            });
          }
        }

        if (farcasterDCsLoaded && unknownConversationIds.length > 0) {
          await processInBatchesWithReduxBatching(
            unknownConversationIds,
            FARCASTER_DATA_BATCH_SIZE,
            (conversationID, batchedUpdates) =>
              fetchConversationWithBatching(conversationID, batchedUpdates),
            dispatch,
            undefined,
            addLog,
          );
        }

        if (updateInfos.length > 0) {
          dispatch({
            type: processFarcasterOpsActionType,
            payload: {
              rawMessageInfos: [],
              updateInfos,
            },
          });
        }
      } catch (e) {
        addLog(
          'Farcaster: Failed to handle inbox status',
          JSON.stringify({
            error: getMessageForException(e),
            unreadCount: unreadConversationIds.length,
            readCount: readConversationIds.length,
          }),
          new Set([logTypes.FARCASTER]),
        );
        throw e;
      }
    },
    [
      currentUserSupportsDCs,
      farcasterDCsLoaded,
      addLog,
      dispatch,
      fetchConversationWithBatching,
      threadInfos,
    ],
  );
}

export {
  useFetchConversation,
  useFetchMessagesForConversation,
  useRefreshFarcasterConversation,
  useAddNewFarcasterMessage,
  useFarcasterSync,
  useFarcasterThreadRefresher,
  useLightweightSyncOnAppStart,
  useHandleFarcasterInboxStatus,
};
