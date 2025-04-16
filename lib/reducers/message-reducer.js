// @flow

import invariant from 'invariant';
import _difference from 'lodash/fp/difference.js';
import _flow from 'lodash/fp/flow.js';
import _isEqual from 'lodash/fp/isEqual.js';
import _keyBy from 'lodash/fp/keyBy.js';
import _map from 'lodash/fp/map.js';
import _mapKeys from 'lodash/fp/mapKeys.js';
import _mapValues from 'lodash/fp/mapValues.js';
import _omit from 'lodash/fp/omit.js';
import _omitBy from 'lodash/fp/omitBy.js';
import _pick from 'lodash/fp/pick.js';
import _pickBy from 'lodash/fp/pickBy.js';
import _uniq from 'lodash/fp/uniq.js';

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import {
  createOrUpdateFarcasterChannelTagActionTypes,
  deleteFarcasterChannelTagActionTypes,
} from '../actions/community-actions.js';
import {
  createEntryActionTypes,
  saveEntryActionTypes,
  deleteEntryActionTypes,
  restoreEntryActionTypes,
} from '../actions/entry-actions.js';
import {
  toggleMessagePinActionTypes,
  fetchMessagesBeforeCursorActionTypes,
  fetchMostRecentMessagesActionTypes,
  sendTextMessageActionTypes,
  sendMultimediaMessageActionTypes,
  sendReactionMessageActionTypes,
  sendEditMessageActionTypes,
  saveMessagesActionType,
  processMessagesActionType,
  messageStorePruneActionType,
  createLocalMessageActionType,
  fetchSingleMostRecentMessagesFromThreadsActionTypes,
  sendDeleteMessageActionTypes,
} from '../actions/message-actions.js';
import { sendMessageReportActionTypes } from '../actions/message-report-actions.js';
import { legacySiweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  changeThreadSettingsActionTypes,
  deleteThreadActionTypes,
  leaveThreadActionTypes,
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  joinThreadActionTypes,
} from '../actions/thread-actions.js';
import { fetchPendingUpdatesActionTypes } from '../actions/update-actions.js';
import { updateMultimediaMessageMediaActionType } from '../actions/upload-actions.js';
import {
  keyserverAuthActionTypes,
  deleteKeyserverAccountActionTypes,
  legacyLogInActionTypes,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import {
  messageStoreOpsHandlers,
  type MessageStoreOperation,
  type ReplaceMessageOperation,
  type ReplaceMessageStoreLocalMessageInfoOperation,
} from '../ops/message-store-ops.js';
import { pendingToRealizedThreadIDsSelector } from '../selectors/thread-selectors.js';
import {
  messageID,
  sortMessageInfoList,
  sortMessageIDs,
  mergeThreadMessageInfos,
  findNewestMessageTimePerKeyserver,
  localIDPrefix,
} from '../shared/message-utils.js';
import {
  parsePendingThreadID,
  threadHasPermission,
  threadInChatList,
  threadIsPending,
} from '../shared/thread-utils.js';
import threadWatcher from '../shared/thread-watcher.js';
import { unshimMessageInfos } from '../shared/unshim-utils.js';
import { updateSpecs } from '../shared/updates/update-specs.js';
import { recoveryFromReduxActionSources } from '../types/account-types.js';
import { processDMOpsActionType } from '../types/dm-ops.js';
import type { Media, Image } from '../types/media-types.js';
import { messageTypes } from '../types/message-types-enum.js';
import {
  type RawMessageInfo,
  type LocalMessageInfo,
  type MessageStore,
  type MessageTruncationStatus,
  type MessageTruncationStatuses,
  messageTruncationStatus,
  defaultNumberPerThread,
  type ThreadMessageInfo,
  type MessageStoreLocalMessageInfos,
} from '../types/message-types.js';
import type { RawImagesMessageInfo } from '../types/messages/images.js';
import type { RawMediaMessageInfo } from '../types/messages/media.js';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { type BaseAction } from '../types/redux-types.js';
import { processServerRequestsActionType } from '../types/request-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
  stateSyncPayloadTypes,
} from '../types/socket-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import { threadTypeIsThick } from '../types/thread-types-enum.js';
import type {
  LegacyRawThreadInfo,
  RawThreadInfos,
  MixedRawThreadInfos,
} from '../types/thread-types.js';
import {
  type ClientUpdateInfo,
  processUpdatesActionType,
} from '../types/update-types.js';
import { translateClientDBThreadMessageInfos } from '../utils/message-ops-utils.js';

const _mapValuesWithKeys = _mapValues.convert({ cap: false });

// Input must already be ordered!
function mapThreadsToMessageIDsFromOrderedMessageInfos(
  orderedMessageInfos: $ReadOnlyArray<RawMessageInfo>,
): { [threadID: string]: string[] } {
  const threadsToMessageIDs: { [threadID: string]: string[] } = {};
  for (const messageInfo of orderedMessageInfos) {
    const key = messageID(messageInfo);
    if (!threadsToMessageIDs[messageInfo.threadID]) {
      threadsToMessageIDs[messageInfo.threadID] = [key];
    } else {
      threadsToMessageIDs[messageInfo.threadID].push(key);
    }
  }
  return threadsToMessageIDs;
}

function isThreadWatched(
  threadID: string,
  threadInfo: ?LegacyRawThreadInfo | ?RawThreadInfo,
  watchedIDs: $ReadOnlyArray<string>,
) {
  return (
    threadIsPending(threadID) ||
    (threadInfo &&
      threadHasPermission(threadInfo, threadPermissions.VISIBLE) &&
      (threadInChatList(threadInfo) ||
        watchedIDs.includes(threadID) ||
        threadTypeIsThick(threadInfo.type)))
  );
}

const newThread = (): ThreadMessageInfo => ({
  messageIDs: [],
  startReached: false,
});

type FreshMessageStoreResult = {
  +messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
  +messageStore: MessageStore,
};
function freshMessageStore(
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatus: { [threadID: string]: MessageTruncationStatus },
  currentAsOf: { +[keyserverID: string]: number },
  threadInfos: MixedRawThreadInfos,
): FreshMessageStoreResult {
  const unshimmed = unshimMessageInfos(messageInfos);
  const orderedMessageInfos = sortMessageInfoList(unshimmed);
  const messages = _keyBy(messageID)(orderedMessageInfos);

  const messageStoreReplaceOperations = orderedMessageInfos.map(
    messageInfo => ({
      type: 'replace',
      payload: { id: messageID(messageInfo), messageInfo },
    }),
  );

  const threadsToMessageIDs =
    mapThreadsToMessageIDsFromOrderedMessageInfos(orderedMessageInfos);
  const threads = _mapValuesWithKeys(
    (messageIDs: string[], threadID: string) => ({
      ...newThread(),
      messageIDs,
      startReached:
        truncationStatus[threadID] === messageTruncationStatus.EXHAUSTIVE,
    }),
  )(threadsToMessageIDs);
  const watchedIDs = threadWatcher.getWatchedIDs();
  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    if (
      threads[threadID] ||
      !isThreadWatched(threadID, threadInfo, watchedIDs)
    ) {
      continue;
    }
    threads[threadID] = newThread();
  }

  const messageStoreOperations = [
    { type: 'remove_all' },
    {
      type: 'remove_all_threads',
    },
    {
      type: 'remove_all_local_message_infos',
    },
    {
      type: 'replace_threads',
      payload: { threads },
    },
    ...messageStoreReplaceOperations,
  ];

  return {
    messageStoreOperations,
    messageStore: {
      messages,
      threads,
      local: {},
      currentAsOf,
    },
  };
}

type ReassignmentResult = {
  +messageStoreOperations: MessageStoreOperation[],
  +messageStore: MessageStore,
  +reassignedThreadIDs: string[],
};

function reassignMessagesToRealizedThreads(
  messageStore: MessageStore,
  threadInfos: RawThreadInfos,
): ReassignmentResult {
  const pendingToRealizedThreadIDs =
    pendingToRealizedThreadIDsSelector(threadInfos);

  const messageStoreOperations: MessageStoreOperation[] = [];
  const messages: { [string]: RawMessageInfo } = {};
  for (const storeMessageID in messageStore.messages) {
    const message = messageStore.messages[storeMessageID];
    const newThreadID = pendingToRealizedThreadIDs.get(message.threadID);

    messages[storeMessageID] = newThreadID
      ? {
          ...message,
          threadID: newThreadID,
          time: threadInfos[newThreadID]?.creationTime ?? message.time,
        }
      : message;

    if (!newThreadID) {
      continue;
    }

    const updateMsgOperation: ReplaceMessageOperation = {
      type: 'replace',
      payload: { id: storeMessageID, messageInfo: messages[storeMessageID] },
    };

    messageStoreOperations.push(updateMsgOperation);
  }

  const threads: { [string]: ThreadMessageInfo } = {};
  const reassignedThreadIDs = [];
  const updatedThreads: { [string]: ThreadMessageInfo } = {};
  const threadsToRemove = [];
  for (const threadID in messageStore.threads) {
    const threadMessageInfo = messageStore.threads[threadID];
    const newThreadID = pendingToRealizedThreadIDs.get(threadID);
    if (!newThreadID) {
      threads[threadID] = threadMessageInfo;
      continue;
    }
    const realizedThread = messageStore.threads[newThreadID];
    if (!realizedThread) {
      reassignedThreadIDs.push(newThreadID);
      threads[newThreadID] = threadMessageInfo;
      updatedThreads[newThreadID] = threadMessageInfo;
      threadsToRemove.push(threadID);
      continue;
    }
    threads[newThreadID] = mergeThreadMessageInfos(
      threadMessageInfo,
      realizedThread,
      messages,
    );
    updatedThreads[newThreadID] = threads[newThreadID];
  }
  if (threadsToRemove.length) {
    messageStoreOperations.push({
      type: 'remove_threads',
      payload: {
        ids: threadsToRemove,
      },
    });
  }
  if (Object.keys(updatedThreads).length > 0) {
    messageStoreOperations.push({
      type: 'replace_threads',
      payload: {
        threads: updatedThreads,
      },
    });
  }

  return {
    messageStoreOperations,
    messageStore: {
      ...messageStore,
      threads,
      messages,
    },
    reassignedThreadIDs,
  };
}

type MergeNewMessagesResult = {
  +messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
  +messageStore: MessageStore,
};
// oldMessageStore is from the old state
// newMessageInfos, truncationStatus come from server
function mergeNewMessages(
  oldMessageStore: MessageStore,
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatus: { +[threadID: string]: MessageTruncationStatus },
  threadInfos: RawThreadInfos,
): MergeNewMessagesResult {
  const {
    messageStoreOperations: updateWithLatestThreadInfosOps,
    messageStore: messageStoreUpdatedWithLatestThreadInfos,
    reassignedThreadIDs,
  } = updateMessageStoreWithLatestThreadInfos(oldMessageStore, threadInfos);

  const messageStoreAfterUpdateOps = processMessageStoreOperations(
    oldMessageStore,
    updateWithLatestThreadInfosOps,
  );

  const updatedMessageStore = {
    ...messageStoreUpdatedWithLatestThreadInfos,
    messages: messageStoreAfterUpdateOps.messages,
    threads: messageStoreAfterUpdateOps.threads,
    local: messageStoreAfterUpdateOps.local,
  };

  const localIDsToServerIDs: Map<string, string> = new Map();

  const watchedThreadIDs = [
    ...threadWatcher.getWatchedIDs(),
    ...reassignedThreadIDs,
  ];
  const unshimmedNewMessages = unshimMessageInfos(newMessageInfos);
  const unshimmedNewMessagesOfWatchedThreads = unshimmedNewMessages.filter(
    msg =>
      isThreadWatched(
        msg.threadID,
        threadInfos[msg.threadID],
        watchedThreadIDs,
      ),
  );
  const orderedNewMessageInfos = _flow(
    _map((messageInfo: RawMessageInfo) => {
      const { id: inputID } = messageInfo;
      invariant(inputID, 'new messageInfos should have serverID');
      invariant(
        !threadIsPending(messageInfo.threadID),
        'new messageInfos should have realized thread id',
      );
      const currentMessageInfo = updatedMessageStore.messages[inputID];
      if (
        messageInfo.type === messageTypes.TEXT ||
        messageInfo.type === messageTypes.IMAGES ||
        messageInfo.type === messageTypes.MULTIMEDIA
      ) {
        const { localID: inputLocalID } = messageInfo;
        const currentLocalMessageInfo = inputLocalID
          ? updatedMessageStore.messages[inputLocalID]
          : null;
        if (currentMessageInfo && currentMessageInfo.localID) {
          // If the client already has a RawMessageInfo with this serverID, keep
          // any localID associated with the existing one. This is because we
          // use localIDs as React keys and changing React keys leads to loss of
          // component state. (The conditional below is for Flow)
          if (messageInfo.type === messageTypes.TEXT) {
            messageInfo = {
              ...messageInfo,
              localID: currentMessageInfo.localID,
            };
          } else if (messageInfo.type === messageTypes.MULTIMEDIA) {
            messageInfo = ({
              ...messageInfo,
              localID: currentMessageInfo.localID,
            }: RawMediaMessageInfo);
          } else {
            messageInfo = ({
              ...messageInfo,
              localID: currentMessageInfo.localID,
            }: RawImagesMessageInfo);
          }
        } else if (currentLocalMessageInfo && currentLocalMessageInfo.localID) {
          // If the client has a RawMessageInfo with this localID, but not with
          // the serverID, that means the message creation succeeded but the
          // success action never got processed. We set a key in
          // localIDsToServerIDs here to fix the messageIDs for the rest of the
          // MessageStore too. (The conditional below is for Flow)
          invariant(inputLocalID, 'inputLocalID should be set');
          localIDsToServerIDs.set(inputLocalID, inputID);
          if (messageInfo.type === messageTypes.TEXT) {
            messageInfo = {
              ...messageInfo,
              localID: currentLocalMessageInfo.localID,
            };
          } else if (messageInfo.type === messageTypes.MULTIMEDIA) {
            messageInfo = ({
              ...messageInfo,
              localID: currentLocalMessageInfo.localID,
            }: RawMediaMessageInfo);
          } else {
            messageInfo = ({
              ...messageInfo,
              localID: currentLocalMessageInfo.localID,
            }: RawImagesMessageInfo);
          }
        } else {
          // If neither the serverID nor the localID from the delivered
          // RawMessageInfo exists in the client store, then this message is
          // brand new to us. Ignore any localID provided by the server.
          // (The conditional below is for Flow)
          const { localID, ...rest } = messageInfo;
          if (rest.type === messageTypes.TEXT) {
            messageInfo = { ...rest };
          } else if (rest.type === messageTypes.MULTIMEDIA) {
            messageInfo = ({ ...rest }: RawMediaMessageInfo);
          } else {
            messageInfo = ({ ...rest }: RawImagesMessageInfo);
          }
        }
      } else if (
        currentMessageInfo &&
        messageInfo.time > currentMessageInfo.time
      ) {
        // When thick threads will be introduced it will be possible for two
        // clients to create the same message (e.g. when they create the same
        // sidebar at the same time). We're going to use deterministic ids for
        // messages which should be unique within a thread and we have to find
        // a way for clients to agree which message to keep. We can't rely on
        // always choosing incoming messages nor messages from the store,
        // because a message that is in one user's store, will be send to
        // another user. One way to deal with it is to always choose a message
        // which is older, according to its timestamp. We can use this strategy
        // only for messages that can start a thread, because for other types
        // it might break the "contiguous" property of message ids (we can
        // consider selecting younger messages in that case, but for now we use
        // an invariant).
        invariant(
          messageInfo.type === messageTypes.CREATE_SIDEBAR ||
            messageInfo.type === messageTypes.CREATE_THREAD ||
            messageInfo.type === messageTypes.SIDEBAR_SOURCE,
          `Two different messages of type ${messageInfo.type} with the same ` +
            'id found',
        );
        return currentMessageInfo;
      }
      return _isEqual(messageInfo)(currentMessageInfo)
        ? currentMessageInfo
        : messageInfo;
    }),
    sortMessageInfoList,
  )(unshimmedNewMessagesOfWatchedThreads);

  const newMessageOps: MessageStoreOperation[] = [];
  const threadsToMessageIDs = mapThreadsToMessageIDsFromOrderedMessageInfos(
    orderedNewMessageInfos,
  );
  const oldMessageInfosToCombine = [];
  const threadsThatNeedMessageIDsResorted = [];
  const updatedThreads: { [string]: ThreadMessageInfo } = {};
  const threads = _flow(
    _mapValuesWithKeys((messageIDs: string[], threadID: string) => {
      const oldThread = updatedMessageStore.threads[threadID];
      const truncate = truncationStatus[threadID];
      if (!oldThread) {
        updatedThreads[threadID] = {
          ...newThread(),
          messageIDs,
          startReached: truncate === messageTruncationStatus.EXHAUSTIVE,
        };
        return updatedThreads[threadID];
      }
      let oldMessageIDsUnchanged = true;
      const oldMessageIDs = oldThread.messageIDs.map(oldID => {
        const newID = localIDsToServerIDs.get(oldID);
        if (newID !== null && newID !== undefined) {
          oldMessageIDsUnchanged = false;
          return newID;
        }
        return oldID;
      });
      if (truncate === messageTruncationStatus.TRUNCATED) {
        // If the result set in the payload isn't contiguous with what we have
        // now, that means we need to dump what we have in the state and replace
        // it with the result set. We do this to achieve our two goals for the
        // messageStore: currentness and contiguousness.
        newMessageOps.push({
          type: 'remove_messages_for_threads',
          payload: { threadIDs: [threadID] },
        });
        updatedThreads[threadID] = {
          messageIDs,
          startReached: false,
        };
        return updatedThreads[threadID];
      }
      const oldNotInNew = _difference(oldMessageIDs)(messageIDs);
      for (const id of oldNotInNew) {
        const oldMessageInfo = updatedMessageStore.messages[id];
        invariant(oldMessageInfo, `could not find ${id} in messageStore`);
        oldMessageInfosToCombine.push(oldMessageInfo);
        const localInfo = updatedMessageStore.local[id];
        if (localInfo) {
          newMessageOps.push({
            type: 'replace_local_message_info',
            payload: {
              id,
              localMessageInfo: localInfo,
            },
          });
        }
      }
      const startReached =
        oldThread.startReached ||
        truncate === messageTruncationStatus.EXHAUSTIVE;
      if (_difference(messageIDs)(oldMessageIDs).length === 0) {
        if (startReached === oldThread.startReached && oldMessageIDsUnchanged) {
          return oldThread;
        }
        updatedThreads[threadID] = {
          messageIDs: oldMessageIDs,
          startReached,
        };
        return updatedThreads[threadID];
      }
      const mergedMessageIDs = [...messageIDs, ...oldNotInNew];
      threadsThatNeedMessageIDsResorted.push(threadID);
      return {
        messageIDs: mergedMessageIDs,
        startReached,
      };
    }),
    _pickBy(thread => !!thread),
  )(threadsToMessageIDs);

  for (const threadID in updatedMessageStore.threads) {
    if (threads[threadID]) {
      continue;
    }
    let thread = updatedMessageStore.threads[threadID];
    const truncate = truncationStatus[threadID];
    if (truncate === messageTruncationStatus.EXHAUSTIVE) {
      thread = {
        ...thread,
        startReached: true,
      };
    }
    threads[threadID] = thread;
    updatedThreads[threadID] = thread;

    for (const id of thread.messageIDs) {
      const messageInfo = updatedMessageStore.messages[id];
      if (messageInfo) {
        oldMessageInfosToCombine.push(messageInfo);
      }
      const localInfo = updatedMessageStore.local[id];
      if (localInfo) {
        newMessageOps.push({
          type: 'replace_local_message_info',
          payload: {
            id,
            localMessageInfo: localInfo,
          },
        });
      }
    }
  }

  const messages = _flow(
    sortMessageInfoList,
    _keyBy(messageID),
  )([...orderedNewMessageInfos, ...oldMessageInfosToCombine]);

  const newMessages = _keyBy(messageID)(orderedNewMessageInfos);
  for (const id in newMessages) {
    newMessageOps.push({
      type: 'replace',
      payload: { id, messageInfo: newMessages[id] },
    });
  }

  if (localIDsToServerIDs.size > 0) {
    newMessageOps.push({
      type: 'remove',
      payload: { ids: [...localIDsToServerIDs.keys()] },
    });
  }

  for (const threadID of threadsThatNeedMessageIDsResorted) {
    threads[threadID].messageIDs = sortMessageIDs(messages)(
      threads[threadID].messageIDs,
    );
    updatedThreads[threadID] = threads[threadID];
  }

  // We don't want to persist an information about startReached for thick
  // thread containing more than defaultNumberPerThread messages. The reason
  // is that after closing and reopening the app, we're fetching only a subset
  // of messages. If we read startReached = true from the DB, we won't attempt
  // fetching more batches of messages.
  const dbOps = [
    ...newMessageOps,
    {
      type: 'replace_threads',
      payload: {
        threads: Object.fromEntries(
          Object.entries(updatedThreads).map(([threadID, thread]) => {
            let isThreadThick;
            if (threadInfos[threadID]) {
              isThreadThick = threadInfos[threadID].thick;
            } else {
              const threadIDParseResult = parsePendingThreadID(threadID);
              isThreadThick = threadIDParseResult
                ? threadTypeIsThick(threadIDParseResult.threadType)
                : false;
            }
            return [
              threadID,
              isThreadThick
                ? {
                    ...thread,
                    startReached:
                      thread.messageIDs.length < defaultNumberPerThread,
                  }
                : thread,
            ];
          }),
        ),
      },
    },
  ];
  newMessageOps.push({
    type: 'replace_threads',
    payload: {
      threads: updatedThreads,
    },
  });

  const processedMessageStore = processMessageStoreOperations(
    updatedMessageStore,
    newMessageOps,
  );

  const currentAsOf: { [keyserverID: string]: number } = {};
  const newestMessageTimePerKeyserver = findNewestMessageTimePerKeyserver(
    orderedNewMessageInfos,
  );
  for (const keyserverID in newestMessageTimePerKeyserver) {
    currentAsOf[keyserverID] = Math.max(
      newestMessageTimePerKeyserver[keyserverID],
      processedMessageStore.currentAsOf[keyserverID] ?? 0,
    );
  }

  const messageStore = {
    messages: processedMessageStore.messages,
    threads: processedMessageStore.threads,
    local: processedMessageStore.local,
    currentAsOf: {
      ...processedMessageStore.currentAsOf,
      ...currentAsOf,
    },
  };

  return {
    messageStoreOperations: [...updateWithLatestThreadInfosOps, ...dbOps],
    messageStore,
  };
}

type UpdateMessageStoreWithLatestThreadInfosResult = {
  +messageStoreOperations: MessageStoreOperation[],
  +messageStore: MessageStore,
  +reassignedThreadIDs: string[],
};
function updateMessageStoreWithLatestThreadInfos(
  messageStore: MessageStore,
  threadInfos: RawThreadInfos,
): UpdateMessageStoreWithLatestThreadInfosResult {
  const messageStoreOperations: MessageStoreOperation[] = [];
  const {
    messageStore: reassignedMessageStore,
    messageStoreOperations: reassignMessagesOps,
    reassignedThreadIDs,
  } = reassignMessagesToRealizedThreads(messageStore, threadInfos);
  messageStoreOperations.push(...reassignMessagesOps);
  const watchedIDs = [...threadWatcher.getWatchedIDs(), ...reassignedThreadIDs];

  const filteredThreads: { [string]: ThreadMessageInfo } = {};
  const threadsToRemoveMessagesFrom = [];
  const messageIDsToRemove: string[] = [];
  for (const threadID in reassignedMessageStore.threads) {
    const threadMessageInfo = reassignedMessageStore.threads[threadID];
    const threadInfo = threadInfos[threadID];
    if (isThreadWatched(threadID, threadInfo, watchedIDs)) {
      filteredThreads[threadID] = threadMessageInfo;
    } else {
      threadsToRemoveMessagesFrom.push(threadID);
      messageIDsToRemove.push(...threadMessageInfo.messageIDs);
    }
  }

  const updatedThreads: { [string]: ThreadMessageInfo } = {};
  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    if (
      isThreadWatched(threadID, threadInfo, watchedIDs) &&
      !filteredThreads[threadID]
    ) {
      filteredThreads[threadID] = newThread();
      updatedThreads[threadID] = filteredThreads[threadID];
    }
  }

  messageStoreOperations.push({
    type: 'remove_threads',
    payload: { ids: threadsToRemoveMessagesFrom },
  });

  messageStoreOperations.push({
    type: 'replace_threads',
    payload: {
      threads: updatedThreads,
    },
  });

  messageStoreOperations.push({
    type: 'remove_messages_for_threads',
    payload: { threadIDs: threadsToRemoveMessagesFrom },
  });

  const localMessagesToRemove = _pick(messageIDsToRemove)(
    reassignedMessageStore.local,
  );
  messageStoreOperations.push({
    type: 'remove_local_message_infos',
    payload: { ids: Object.keys(localMessagesToRemove) },
  });

  return {
    messageStoreOperations,
    messageStore: {
      messages: _omit(messageIDsToRemove)(reassignedMessageStore.messages),
      threads: filteredThreads,
      local: _omit(messageIDsToRemove)(reassignedMessageStore.local),
      currentAsOf: reassignedMessageStore.currentAsOf,
    },
    reassignedThreadIDs,
  };
}

function ensureRealizedThreadIDIsUsedWhenPossible<T: RawMessageInfo>(
  payload: T,
  threadInfos: RawThreadInfos,
): T {
  const pendingToRealizedThreadIDs =
    pendingToRealizedThreadIDsSelector(threadInfos);
  const realizedThreadID = pendingToRealizedThreadIDs.get(payload.threadID);
  return realizedThreadID
    ? { ...payload, threadID: realizedThreadID }
    : payload;
}

const { processStoreOperations: processMessageStoreOperations } =
  messageStoreOpsHandlers;

type ReduceMessageStoreResult = {
  +messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
  +messageStore: MessageStore,
};
function reduceMessageStore(
  messageStore: MessageStore,
  action: BaseAction,
  newThreadInfos: RawThreadInfos,
): ReduceMessageStoreResult {
  if (
    action.type === legacyLogInActionTypes.success ||
    action.type === legacySiweAuthActionTypes.success
  ) {
    const { messagesResult } = action.payload;
    let { messageInfos } = messagesResult;

    // If it's a resolution attempt and the userID doesn't change,
    // then we should keep all local messages in the store
    // TODO we can't check if the userID changed until ENG-6126
    if (
      action.payload.authActionSource ===
        recoveryFromReduxActionSources.cookieInvalidationResolutionAttempt ||
      action.payload.authActionSource ===
        recoveryFromReduxActionSources.socketAuthErrorResolutionAttempt
    ) {
      const localMessages = Object.values(messageStore.messages).filter(
        rawMessageInfo => messageID(rawMessageInfo).startsWith(localIDPrefix),
      );
      messageInfos = [...messageInfos, ...localMessages];
    }

    const { messageStoreOperations, messageStore: freshStore } =
      freshMessageStore(
        messageInfos,
        messagesResult.truncationStatus,
        messagesResult.currentAsOf,
        newThreadInfos,
      );

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    return {
      messageStoreOperations,
      messageStore: {
        ...freshStore,
        messages: processedMessageStore.messages,
        threads: processedMessageStore.threads,
        local: processedMessageStore.local,
      },
    };
  } else if (action.type === keyserverAuthActionTypes.success) {
    const { messagesResult } = action.payload;
    return mergeNewMessages(
      messageStore,
      messagesResult.messageInfos,
      messagesResult.truncationStatus,
      newThreadInfos,
    );
  } else if (action.type === incrementalStateSyncActionType) {
    const { messagesResult, updatesResult } = action.payload;
    if (
      messagesResult.rawMessageInfos.length === 0 &&
      updatesResult.newUpdates.length === 0
    ) {
      return { messageStoreOperations: [], messageStore };
    }

    const newMessagesResult = mergeUpdatesWithMessageInfos(
      messagesResult.rawMessageInfos,
      updatesResult.newUpdates,
      messagesResult.truncationStatuses,
    );

    return mergeNewMessages(
      messageStore,
      newMessagesResult.rawMessageInfos,
      newMessagesResult.truncationStatuses,
      newThreadInfos,
    );
  } else if (
    action.type === fetchPendingUpdatesActionTypes.success &&
    action.payload.type === stateSyncPayloadTypes.INCREMENTAL
  ) {
    const { messagesResult, updatesResult } = action.payload;
    if (
      messagesResult.rawMessageInfos.length === 0 &&
      updatesResult.newUpdates.length === 0
    ) {
      return { messageStoreOperations: [], messageStore };
    }

    const newMessagesResult = mergeUpdatesWithMessageInfos(
      messagesResult.rawMessageInfos,
      updatesResult.newUpdates,
      messagesResult.truncationStatuses,
    );

    return mergeNewMessages(
      messageStore,
      newMessagesResult.rawMessageInfos,
      newMessagesResult.truncationStatuses,
      newThreadInfos,
    );
  } else if (action.type === processUpdatesActionType) {
    if (action.payload.updatesResult.newUpdates.length === 0) {
      return { messageStoreOperations: [], messageStore };
    }

    const messagesResult = mergeUpdatesWithMessageInfos(
      [],
      action.payload.updatesResult.newUpdates,
    );

    const { messageStoreOperations, messageStore: newMessageStore } =
      mergeNewMessages(
        messageStore,
        messagesResult.rawMessageInfos,
        messagesResult.truncationStatuses,
        newThreadInfos,
      );
    return {
      messageStoreOperations,
      messageStore: {
        messages: newMessageStore.messages,
        threads: newMessageStore.threads,
        local: newMessageStore.local,
        currentAsOf: messageStore.currentAsOf,
      },
    };
  } else if (
    action.type === fullStateSyncActionType ||
    action.type === processMessagesActionType ||
    (action.type === fetchPendingUpdatesActionTypes.success &&
      action.payload.type === stateSyncPayloadTypes.FULL)
  ) {
    const { messagesResult } = action.payload;
    return mergeNewMessages(
      messageStore,
      messagesResult.rawMessageInfos,
      messagesResult.truncationStatuses,
      newThreadInfos,
    );
  } else if (
    action.type === fetchSingleMostRecentMessagesFromThreadsActionTypes.success
  ) {
    return mergeNewMessages(
      messageStore,
      action.payload.rawMessageInfos,
      action.payload.truncationStatuses,
      newThreadInfos,
    );
  } else if (
    action.type === fetchMessagesBeforeCursorActionTypes.success ||
    action.type === fetchMostRecentMessagesActionTypes.success
  ) {
    return mergeNewMessages(
      messageStore,
      action.payload.rawMessageInfos,
      { [action.payload.threadID]: action.payload.truncationStatus },
      newThreadInfos,
    );
  } else if (action.type === deleteKeyserverAccountActionTypes.success) {
    const { messageStoreOperations, messageStore: filteredMessageStore } =
      updateMessageStoreWithLatestThreadInfos(messageStore, newThreadInfos);

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    let currentAsOf = {};
    if (action.payload.keyserverIDs) {
      currentAsOf = _omit(action.payload.keyserverIDs)(
        filteredMessageStore.currentAsOf,
      );
    }

    return {
      messageStoreOperations,
      messageStore: {
        ...filteredMessageStore,
        currentAsOf,
        messages: processedMessageStore.messages,
        threads: processedMessageStore.threads,
        local: processedMessageStore.local,
      },
    };
  } else if (
    action.type === deleteThreadActionTypes.success ||
    action.type === leaveThreadActionTypes.success ||
    action.type === setNewSessionActionType
  ) {
    const { messageStoreOperations, messageStore: filteredMessageStore } =
      updateMessageStoreWithLatestThreadInfos(messageStore, newThreadInfos);

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    return {
      messageStoreOperations,
      messageStore: {
        ...filteredMessageStore,
        messages: processedMessageStore.messages,
        threads: processedMessageStore.threads,
        local: processedMessageStore.local,
      },
    };
  } else if (action.type === newThreadActionTypes.success) {
    const messagesResult = mergeUpdatesWithMessageInfos(
      action.payload.newMessageInfos,
      action.payload.updatesResult.newUpdates,
    );
    return mergeNewMessages(
      messageStore,
      messagesResult.rawMessageInfos,
      messagesResult.truncationStatuses,
      newThreadInfos,
    );
  } else if (action.type === sendMessageReportActionTypes.success) {
    const { messageInfo } = action.payload;
    if (messageInfo) {
      return mergeNewMessages(
        messageStore,
        [messageInfo],
        {
          [(messageInfo.threadID: string)]: messageTruncationStatus.UNCHANGED,
        },
        newThreadInfos,
      );
    }
  } else if (
    action.type === changeThreadSettingsActionTypes.success ||
    action.type === removeUsersFromThreadActionTypes.success ||
    action.type === changeThreadMemberRolesActionTypes.success ||
    action.type === createEntryActionTypes.success ||
    action.type === saveEntryActionTypes.success ||
    action.type === restoreEntryActionTypes.success ||
    action.type === toggleMessagePinActionTypes.success
  ) {
    return mergeNewMessages(
      messageStore,
      action.payload.newMessageInfos,
      {
        [(action.payload.threadID: string)]: messageTruncationStatus.UNCHANGED,
      },
      newThreadInfos,
    );
  } else if (
    (action.type === createOrUpdateFarcasterChannelTagActionTypes.success &&
      action.payload.newMessageInfos) ||
    (action.type === deleteFarcasterChannelTagActionTypes.success &&
      action.payload.newMessageInfos)
  ) {
    return mergeNewMessages(
      messageStore,
      action.payload.newMessageInfos,
      {
        [(action.payload.commCommunityID: string)]:
          messageTruncationStatus.UNCHANGED,
      },
      newThreadInfos,
    );
  } else if (action.type === deleteEntryActionTypes.success) {
    const payload = action.payload;
    if (payload) {
      return mergeNewMessages(
        messageStore,
        payload.newMessageInfos,
        { [payload.threadID]: messageTruncationStatus.UNCHANGED },
        newThreadInfos,
      );
    }
  } else if (action.type === joinThreadActionTypes.success) {
    const messagesResult = mergeUpdatesWithMessageInfos(
      action.payload.rawMessageInfos,
      action.payload.updatesResult.newUpdates,
    );
    return mergeNewMessages(
      messageStore,
      messagesResult.rawMessageInfos,
      messagesResult.truncationStatuses,
      newThreadInfos,
    );
  } else if (
    action.type === sendEditMessageActionTypes.success ||
    action.type === sendDeleteMessageActionTypes.success
  ) {
    const { newMessageInfos } = action.payload;
    const truncationStatuses: { [string]: MessageTruncationStatus } = {};
    for (const messageInfo of newMessageInfos) {
      truncationStatuses[messageInfo.threadID] =
        messageTruncationStatus.UNCHANGED;
    }
    return mergeNewMessages(
      messageStore,
      newMessageInfos,
      truncationStatuses,
      newThreadInfos,
    );
  } else if (
    action.type === sendTextMessageActionTypes.started ||
    action.type === sendMultimediaMessageActionTypes.started ||
    action.type === sendReactionMessageActionTypes.started
  ) {
    const payload = ensureRealizedThreadIDIsUsedWhenPossible(
      action.payload,
      newThreadInfos,
    );
    const { localID, threadID } = payload;
    invariant(localID, `localID should be set on ${action.type}`);

    const messageIDs = messageStore.threads[threadID]?.messageIDs ?? [];
    if (!messageStore.messages[localID]) {
      for (const existingMessageID of messageIDs) {
        const existingMessageInfo = messageStore.messages[existingMessageID];
        if (existingMessageInfo && existingMessageInfo.localID === localID) {
          return { messageStoreOperations: [], messageStore };
        }
      }
    }

    const messageStoreOperations: MessageStoreOperation[] = [
      {
        type: 'replace',
        payload: { id: localID, messageInfo: payload },
      },
    ];

    let updatedThreads;
    if (messageStore.messages[localID]) {
      const messages = {
        ...messageStore.messages,
        [(localID: string)]: payload,
      };
      const thread = messageStore.threads[threadID];
      updatedThreads = {
        [(threadID: string)]: {
          messageIDs: sortMessageIDs(messages)(messageIDs),
          startReached: thread?.startReached ?? true,
        },
      };

      messageStoreOperations.push({
        type: 'remove_local_message_infos',
        payload: {
          ids: [localID],
        },
      });
    } else {
      updatedThreads = {
        [(threadID: string)]: messageStore.threads[threadID]
          ? {
              ...messageStore.threads[threadID],
              messageIDs: [localID, ...messageIDs],
            }
          : {
              messageIDs: [localID],
              startReached: true,
            },
      };
    }

    messageStoreOperations.push({
      type: 'replace_threads',
      payload: {
        threads: { ...updatedThreads },
      },
    });

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    const newMessageStore = {
      messages: processedMessageStore.messages,
      threads: processedMessageStore.threads,
      local: processedMessageStore.local,
      currentAsOf: messageStore.currentAsOf,
    };

    return {
      messageStoreOperations,
      messageStore: newMessageStore,
    };
  } else if (
    action.type === sendTextMessageActionTypes.failed ||
    action.type === sendMultimediaMessageActionTypes.failed
  ) {
    const { localID, failedOutboundP2PMessageIDs } = action.payload;

    let newLocalMessageInfo = {
      sendFailed: true,
    };

    // For thick threads, we need to keep track of all not sent P2P messages
    if (failedOutboundP2PMessageIDs && failedOutboundP2PMessageIDs.length > 0) {
      newLocalMessageInfo = {
        ...newLocalMessageInfo,
        outboundP2PMessageIDs: failedOutboundP2PMessageIDs,
      };
    }

    const messageStoreOperations = [
      {
        type: 'replace_local_message_info',
        payload: {
          id: localID,
          localMessageInfo: newLocalMessageInfo,
        },
      },
    ];

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    return {
      messageStoreOperations,
      messageStore: {
        messages: processedMessageStore.messages,
        threads: processedMessageStore.threads,
        local: processedMessageStore.local,
        currentAsOf: messageStore.currentAsOf,
      },
    };
  } else if (action.type === sendReactionMessageActionTypes.failed) {
    const { localID, threadID } = action.payload;
    const messageStoreOperations: MessageStoreOperation[] = [];

    messageStoreOperations.push({
      type: 'remove',
      payload: { ids: [localID] },
    });

    const newMessageIDs = messageStore.threads[threadID].messageIDs.filter(
      id => id !== localID,
    );
    const updatedThreads = {
      [threadID]: {
        ...messageStore.threads[threadID],
        messageIDs: newMessageIDs,
      },
    };

    messageStoreOperations.push({
      type: 'replace_threads',
      payload: { threads: updatedThreads },
    });

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    return {
      messageStoreOperations,
      messageStore: processedMessageStore,
    };
  } else if (
    action.type === sendTextMessageActionTypes.success ||
    action.type === sendMultimediaMessageActionTypes.success ||
    action.type === sendReactionMessageActionTypes.success
  ) {
    const { payload } = action;
    invariant(
      !threadIsPending(payload.threadID),
      'Successful message action should have realized thread id',
    );
    const replaceMessageKey = (messageKey: string) =>
      messageKey === payload.localID ? payload.serverID : messageKey;
    let newMessages;
    const messageStoreOperations: MessageStoreOperation[] = [];
    if (messageStore.messages[payload.serverID]) {
      // If somehow the serverID got in there already, we'll just update the
      // serverID message and scrub the localID one
      newMessages = _omitBy(
        (messageInfo: RawMessageInfo) =>
          messageInfo.type === messageTypes.TEXT &&
          !messageInfo.id &&
          messageInfo.localID === payload.localID,
      )(messageStore.messages);
      messageStoreOperations.push({
        type: 'remove',
        payload: { ids: [payload.localID] },
      });
    } else if (messageStore.messages[payload.localID]) {
      // The normal case, the localID message gets replaced by the serverID one
      newMessages = _mapKeys(replaceMessageKey)(messageStore.messages);
      messageStoreOperations.push({
        type: 'rekey',
        payload: { from: payload.localID, to: payload.serverID },
      });
    } else {
      // Well this is weird, we probably got deauthorized between when the
      // action was dispatched and when we ran this reducer...
      return { messageStoreOperations, messageStore };
    }

    const newMessage = {
      ...newMessages[payload.serverID],
      id: payload.serverID,
      localID: payload.localID,
      time: payload.time,
    };
    newMessages[payload.serverID] = newMessage;
    messageStoreOperations.push({
      type: 'replace',
      payload: { id: payload.serverID, messageInfo: newMessage },
    });
    const threadID = payload.threadID;
    const newMessageIDs = _flow(
      _uniq,
      sortMessageIDs(newMessages),
    )(messageStore.threads[threadID].messageIDs.map(replaceMessageKey));

    messageStoreOperations.push({
      type: 'remove_local_message_infos',
      payload: {
        ids: [payload.localID],
      },
    });

    const updatedThreads = {
      [threadID]: {
        ...messageStore.threads[threadID],
        messageIDs: newMessageIDs,
      },
    };
    messageStoreOperations.push({
      type: 'replace_threads',
      payload: { threads: updatedThreads },
    });

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    return {
      messageStoreOperations,
      messageStore: {
        ...messageStore,
        messages: processedMessageStore.messages,
        threads: processedMessageStore.threads,
        local: processedMessageStore.local,
      },
    };
  } else if (action.type === saveMessagesActionType) {
    const truncationStatuses: { [string]: MessageTruncationStatus } = {};
    for (const messageInfo of action.payload.rawMessageInfos) {
      truncationStatuses[messageInfo.threadID] =
        messageTruncationStatus.UNCHANGED;
    }
    const { messageStoreOperations, messageStore: newMessageStore } =
      mergeNewMessages(
        messageStore,
        action.payload.rawMessageInfos,
        truncationStatuses,
        newThreadInfos,
      );
    return {
      messageStoreOperations,
      messageStore: {
        messages: newMessageStore.messages,
        threads: newMessageStore.threads,
        local: newMessageStore.local,
        // We avoid bumping currentAsOf because notifs may include a contracted
        // RawMessageInfo, so we want to make sure we still fetch it
        currentAsOf: messageStore.currentAsOf,
      },
    };
  } else if (action.type === messageStorePruneActionType) {
    const reduxMessageIDsToPrune: Array<string> = [];
    const dbMessageIDsToPrune: Array<string> = [];

    const updatedThreads: { [string]: ThreadMessageInfo } = {};
    for (const threadID of action.payload.threadIDs) {
      let thread = messageStore.threads[threadID];
      if (!thread) {
        continue;
      }

      const newMessageIDs = [...thread.messageIDs];
      const removed = newMessageIDs.splice(defaultNumberPerThread);
      if (removed.length > 0) {
        thread = {
          ...thread,
          messageIDs: newMessageIDs,
          startReached: false,
        };
      }
      reduxMessageIDsToPrune.push(...removed);
      if (!newThreadInfos[threadID]?.thick) {
        dbMessageIDsToPrune.push(...removed);
      }

      updatedThreads[threadID] = thread;
    }

    const createMessageStoreOperations = (
      messageIDsToPrune: $ReadOnlyArray<string>,
    ) => {
      const localMessageIDsToRemove = _pick(messageIDsToPrune)(
        messageStore.local,
      );

      return [
        {
          type: 'remove',
          payload: { ids: messageIDsToPrune },
        },
        {
          type: 'replace_threads',
          payload: {
            threads: updatedThreads,
          },
        },
        {
          type: 'remove_local_message_infos',
          payload: { ids: Object.keys(localMessageIDsToRemove) },
        },
      ];
    };

    const reduxOperations = createMessageStoreOperations(
      reduxMessageIDsToPrune,
    );
    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      reduxOperations,
    );

    const newMessageStore = {
      messages: processedMessageStore.messages,
      threads: processedMessageStore.threads,
      local: processedMessageStore.local,
      currentAsOf: messageStore.currentAsOf,
    };

    const dbOperations = createMessageStoreOperations(dbMessageIDsToPrune);
    return {
      messageStoreOperations: dbOperations,
      messageStore: newMessageStore,
    };
  } else if (action.type === updateMultimediaMessageMediaActionType) {
    const { messageID: id, currentMediaID, mediaUpdate } = action.payload;
    const message = messageStore.messages[id];
    invariant(message, `message with ID ${id} could not be found`);
    invariant(
      message.type === messageTypes.IMAGES ||
        message.type === messageTypes.MULTIMEDIA,
      `message with ID ${id} is not multimedia`,
    );

    let updatedMessage;
    let replaced = false;
    if (message.type === messageTypes.IMAGES) {
      const media: Image[] = [];
      for (const singleMedia of message.media) {
        if (singleMedia.id !== currentMediaID) {
          media.push(singleMedia);
        } else {
          let updatedMedia: Image = {
            id: mediaUpdate.id ?? singleMedia.id,
            type: 'photo',
            uri: mediaUpdate.uri ?? singleMedia.uri,
            dimensions: mediaUpdate.dimensions ?? singleMedia.dimensions,
            thumbHash: mediaUpdate.thumbHash ?? singleMedia.thumbHash,
          };

          if (
            'localMediaSelection' in singleMedia &&
            !('localMediaSelection' in mediaUpdate)
          ) {
            updatedMedia = {
              ...updatedMedia,
              localMediaSelection: singleMedia.localMediaSelection,
            };
          } else if (mediaUpdate.localMediaSelection) {
            updatedMedia = {
              ...updatedMedia,
              localMediaSelection: mediaUpdate.localMediaSelection,
            };
          }

          media.push(updatedMedia);
          replaced = true;
        }
      }
      updatedMessage = { ...message, media };
    } else {
      const media: Media[] = [];
      for (const singleMedia of message.media) {
        if (singleMedia.id !== currentMediaID) {
          media.push(singleMedia);
        } else if (
          singleMedia.type === 'photo' &&
          mediaUpdate.type === 'photo'
        ) {
          media.push({ ...singleMedia, ...mediaUpdate });
          replaced = true;
        } else if (
          singleMedia.type === 'video' &&
          mediaUpdate.type === 'video'
        ) {
          media.push({ ...singleMedia, ...mediaUpdate });
          replaced = true;
        } else if (
          singleMedia.type === 'encrypted_photo' &&
          mediaUpdate.type === 'encrypted_photo'
        ) {
          if (singleMedia.blobURI) {
            const { holder, ...rest } = mediaUpdate;
            if (holder) {
              console.log(
                `mediaUpdate contained holder for media ${singleMedia.id} ` +
                  'that has blobURI',
              );
            }
            media.push({ ...singleMedia, ...rest });
          } else {
            invariant(
              singleMedia.holder,
              'Encrypted media must have holder or blobURI',
            );
            const { blobURI, ...rest } = mediaUpdate;
            if (blobURI) {
              console.log(
                `mediaUpdate contained blobURI for media ${singleMedia.id} ` +
                  'that has holder',
              );
            }
            media.push({ ...singleMedia, ...rest });
          }
          replaced = true;
        } else if (
          singleMedia.type === 'encrypted_video' &&
          mediaUpdate.type === 'encrypted_video'
        ) {
          if (singleMedia.blobURI) {
            const { holder, thumbnailHolder, ...rest } = mediaUpdate;
            if (holder || thumbnailHolder) {
              console.log(
                'mediaUpdate contained holder or thumbnailHolder for media ' +
                  `${singleMedia.id} that has blobURI`,
              );
            }
            media.push({ ...singleMedia, ...rest });
          } else {
            invariant(
              singleMedia.holder,
              'Encrypted media must have holder or blobURI',
            );
            const { blobURI, thumbnailBlobURI, ...rest } = mediaUpdate;
            if (blobURI || thumbnailBlobURI) {
              console.log(
                'mediaUpdate contained blobURI or thumbnailBlobURI for media ' +
                  `${singleMedia.id} that has holder`,
              );
            }
            media.push({ ...singleMedia, ...rest });
          }
          replaced = true;
        } else if (
          singleMedia.type === 'photo' &&
          mediaUpdate.type === 'encrypted_photo'
        ) {
          // extract fields that are absent in encrypted_photo type
          const { uri, localMediaSelection, ...original } = singleMedia;
          const {
            holder: newHolder,
            blobURI: newBlobURI,
            encryptionKey,
            ...update
          } = mediaUpdate;
          const blobURI = newBlobURI ?? newHolder;
          invariant(
            blobURI && encryptionKey,
            'holder and encryptionKey are required for encrypted_photo message',
          );
          media.push({
            ...original,
            ...update,
            type: 'encrypted_photo',
            blobURI,
            encryptionKey,
          });
          replaced = true;
        } else if (
          singleMedia.type === 'video' &&
          mediaUpdate.type === 'encrypted_video'
        ) {
          const { uri, thumbnailURI, localMediaSelection, ...original } =
            singleMedia;
          const {
            holder: newHolder,
            blobURI: newBlobURI,
            encryptionKey,
            thumbnailHolder: newThumbnailHolder,
            thumbnailBlobURI: newThumbnailBlobURI,
            thumbnailEncryptionKey,
            ...update
          } = mediaUpdate;
          const blobURI = newBlobURI ?? newHolder;
          invariant(
            blobURI && encryptionKey,
            'holder and encryptionKey are required for encrypted_video message',
          );
          const thumbnailBlobURI = newThumbnailBlobURI ?? newThumbnailHolder;
          invariant(
            thumbnailBlobURI && thumbnailEncryptionKey,
            'thumbnailHolder and thumbnailEncryptionKey are required for ' +
              'encrypted_video message',
          );
          media.push({
            ...original,
            ...update,
            type: 'encrypted_video',
            blobURI,
            encryptionKey,
            thumbnailBlobURI,
            thumbnailEncryptionKey,
          });
          replaced = true;
        } else if (mediaUpdate.id) {
          const { id: newID } = mediaUpdate;
          media.push({ ...singleMedia, id: newID });
          replaced = true;
        }
      }
      updatedMessage = { ...message, media };
    }

    invariant(
      replaced,
      `message ${id} did not contain media with ID ${currentMediaID}`,
    );

    const messageStoreOperations = [
      {
        type: 'replace',
        payload: {
          id,
          messageInfo: updatedMessage,
        },
      },
    ];

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    return {
      messageStoreOperations,
      messageStore: {
        ...messageStore,
        messages: processedMessageStore.messages,
        threads: processedMessageStore.threads,
        local: processedMessageStore.local,
      },
    };
  } else if (action.type === createLocalMessageActionType) {
    const messageInfo = ensureRealizedThreadIDIsUsedWhenPossible(
      action.payload,
      newThreadInfos,
    );
    const { localID, threadID } = messageInfo;

    const messageIDs =
      messageStore.threads[messageInfo.threadID]?.messageIDs ?? [];
    const threadState: ThreadMessageInfo = messageStore.threads[threadID]
      ? {
          ...messageStore.threads[threadID],
          messageIDs: [localID, ...messageIDs],
        }
      : {
          messageIDs: [localID],
          startReached: true,
        };

    const messageStoreOperations = [
      {
        type: 'replace',
        payload: { id: localID, messageInfo },
      },
      {
        type: 'replace_threads',
        payload: {
          threads: { [(threadID: string)]: threadState },
        },
      },
    ];

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    return {
      messageStoreOperations,
      messageStore: {
        ...messageStore,
        threads: processedMessageStore.threads,
        messages: processedMessageStore.messages,
        local: processedMessageStore.local,
      },
    };
  } else if (action.type === processServerRequestsActionType) {
    const { messageStoreOperations } = reassignMessagesToRealizedThreads(
      messageStore,
      newThreadInfos,
    );

    if (messageStoreOperations.length === 0) {
      return { messageStoreOperations, messageStore };
    }

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    return {
      messageStoreOperations,
      messageStore: {
        ...messageStore,
        messages: processedMessageStore.messages,
        threads: processedMessageStore.threads,
        local: processedMessageStore.local,
      },
    };
  } else if (action.type === setClientDBStoreActionType) {
    const actionPayloadMessageStoreThreads =
      translateClientDBThreadMessageInfos(
        action.payload.messageStoreThreads ?? [],
      );

    const actionPayloadMessageStoreLocalMessageInfos: MessageStoreLocalMessageInfos =
      action.payload.messageStoreLocalMessageInfos ?? {};

    const messageStoreOperations: Array<MessageStoreOperation> = [];

    for (const localMessageID in actionPayloadMessageStoreLocalMessageInfos) {
      if (
        actionPayloadMessageStoreLocalMessageInfos[localMessageID]
          .outboundP2PMessageIDs &&
        actionPayloadMessageStoreLocalMessageInfos[localMessageID]
          .outboundP2PMessageIDs.length > 0
      ) {
        // If there are `outboundP2PMessages` it means the message failed,
        // but setting `sendFailed` could not be done, e.g. when the app was
        // killed in the process of sending messages.
        messageStoreOperations.push({
          type: 'replace_local_message_info',
          payload: {
            id: localMessageID,
            localMessageInfo: {
              ...actionPayloadMessageStoreLocalMessageInfos[localMessageID],
              sendFailed: true,
            },
          },
        });
      }
    }

    const newThreads: {
      [threadID: string]: ThreadMessageInfo,
    } = { ...messageStore.threads };
    for (const threadID in actionPayloadMessageStoreThreads) {
      newThreads[threadID] = {
        ...actionPayloadMessageStoreThreads[threadID],
        messageIDs: messageStore.threads?.[threadID]?.messageIDs ?? [],
      };
    }

    const payloadMessages = action.payload.messages;
    if (!payloadMessages) {
      return {
        messageStoreOperations: [],
        messageStore: {
          ...messageStore,
          threads: newThreads,
          local: actionPayloadMessageStoreLocalMessageInfos,
        },
      };
    }

    const {
      messageStoreOperations: updatedMessageStoreOperations,
      messageStore: updatedMessageStore,
    } = updateMessageStoreWithLatestThreadInfos(
      {
        ...messageStore,
        threads: newThreads,
        local: actionPayloadMessageStoreLocalMessageInfos,
      },
      newThreadInfos,
    );
    messageStoreOperations.push(...updatedMessageStoreOperations);
    let threads = { ...updatedMessageStore.threads };
    let local = { ...updatedMessageStore.local };

    // Store message IDs already contained within threads so that we
    // do not insert duplicates
    const existingMessageIDs = new Set<string>();
    for (const threadID in threads) {
      threads[threadID].messageIDs.forEach(msgID => {
        existingMessageIDs.add(msgID);
      });
    }
    const threadsNeedMsgIDsResorting = new Set<string>();
    const actionPayloadMessages =
      messageStoreOpsHandlers.translateClientDBData(payloadMessages);

    // When starting the app on native, we filter out any local-only multimedia
    // messages because the relevant context is no longer available
    const messageIDsToBeRemoved = [];
    const threadsToAdd: { [string]: ThreadMessageInfo } = {};
    for (const id in actionPayloadMessages) {
      const message = actionPayloadMessages[id];
      const { threadID } = message;
      let existingThread = threads[threadID];
      if (!existingThread) {
        existingThread = newThread();
        threadsToAdd[threadID] = existingThread;
      }
      if (
        (message.type === messageTypes.IMAGES ||
          message.type === messageTypes.MULTIMEDIA) &&
        !message.id
      ) {
        messageIDsToBeRemoved.push(id);
        threads = {
          ...threads,
          [(threadID: string)]: {
            ...existingThread,
            messageIDs: existingThread.messageIDs.filter(
              curMessageID => curMessageID !== id,
            ),
          },
        };
        local = _pickBy(
          (localInfo: LocalMessageInfo, key: string) => key !== id,
        )(local);
      } else if (!existingMessageIDs.has(id)) {
        threads = {
          ...threads,
          [(threadID: string)]: {
            ...existingThread,
            messageIDs: [...existingThread.messageIDs, id],
          },
        };
        threadsNeedMsgIDsResorting.add(threadID);
      } else if (!threads[threadID]) {
        threads = { ...threads, [(threadID: string)]: existingThread };
      }
    }

    for (const threadID of threadsNeedMsgIDsResorting) {
      threads[threadID].messageIDs = sortMessageIDs(actionPayloadMessages)(
        threads[threadID].messageIDs,
      );
    }

    const newMessageStore = {
      ...updatedMessageStore,
      messages: actionPayloadMessages,
      threads: threads,
      local: local,
    };

    if (messageIDsToBeRemoved.length > 0) {
      messageStoreOperations.push({
        type: 'remove',
        payload: { ids: messageIDsToBeRemoved },
      });
    }

    const processedMessageStore = processMessageStoreOperations(
      newMessageStore,
      messageStoreOperations,
    );

    messageStoreOperations.push({
      type: 'replace_threads',
      payload: { threads: threadsToAdd },
    });

    return {
      messageStoreOperations,
      messageStore: processedMessageStore,
    };
  } else if (action.type === processDMOpsActionType) {
    const {
      rawMessageInfos,
      updateInfos,
      outboundP2PMessages,
      composableMessageID,
    } = action.payload;

    const sendingComposableDMMessageToPeers =
      composableMessageID &&
      outboundP2PMessages &&
      outboundP2PMessages.length > 0;

    // For composable DM messages, we rely on dedicated actions
    // (`sendTextMessageActionTypes` or `sendMultimediaMessageActionTypes`)
    // to update the store, as we want to keep existing sending logic,
    // tracking status, etc.
    // We use `processDMOpsActionType` to schedule messages to other peers,
    // additionally, we need `rawMessageInfos` in the payload to calculate
    // the reply count and set the unread status in the thread store, but here
    // we want to ignore it, as this could result in the message being added
    // to the store twice.
    const updatedRawMessageInfos = sendingComposableDMMessageToPeers
      ? []
      : rawMessageInfos;

    if (
      updatedRawMessageInfos.length === 0 &&
      updateInfos.length === 0 &&
      !sendingComposableDMMessageToPeers
    ) {
      return { messageStoreOperations: [], messageStore };
    }

    const messagesResult = mergeUpdatesWithMessageInfos(
      updatedRawMessageInfos,
      updateInfos,
    );

    const { messageStoreOperations, messageStore: newMessageStore } =
      mergeNewMessages(
        messageStore,
        messagesResult.rawMessageInfos,
        messagesResult.truncationStatuses,
        newThreadInfos,
      );

    if (
      !sendingComposableDMMessageToPeers ||
      !composableMessageID ||
      !outboundP2PMessages ||
      // This is a case when a message is retried,
      // no additional changes are required.
      !!messageStore.local[composableMessageID]
    ) {
      return { messageStoreOperations, messageStore: newMessageStore };
    }

    // Messages to other peers that can be retried from UI,
    // we need to track statuses of each one.
    const outboundP2PMessageIDs = outboundP2PMessages.map(msg => msg.messageID);
    const localOperation: ReplaceMessageStoreLocalMessageInfoOperation = {
      type: 'replace_local_message_info',
      payload: {
        id: composableMessageID,
        localMessageInfo: {
          // Setting it to `false` because sending a message is in progress.
          // It will be set to `true` after we fail to queue at least one
          // message on Tunnelbroker, or this entry will be removed on success.
          sendFailed: false,
          outboundP2PMessageIDs,
        },
      },
    };

    return {
      messageStoreOperations: [...messageStoreOperations, localOperation],
      messageStore: processMessageStoreOperations(newMessageStore, [
        localOperation,
      ]),
    };
  }
  return { messageStoreOperations: [], messageStore };
}

type MergedUpdatesWithMessages = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
};
function mergeUpdatesWithMessageInfos(
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
  newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  truncationStatuses?: MessageTruncationStatuses,
): MergedUpdatesWithMessages {
  const messageIDs = new Set(
    messageInfos.map(messageInfo => messageInfo.id).filter(Boolean),
  );
  const mergedMessageInfos = [...messageInfos];
  const mergedTruncationStatuses = { ...truncationStatuses };

  for (const update of newUpdates) {
    const { mergeMessageInfosAndTruncationStatuses } = updateSpecs[update.type];
    if (!mergeMessageInfosAndTruncationStatuses) {
      continue;
    }
    mergeMessageInfosAndTruncationStatuses(
      messageIDs,
      mergedMessageInfos,
      mergedTruncationStatuses,
      update,
    );
  }
  return {
    rawMessageInfos: mergedMessageInfos,
    truncationStatuses: mergedTruncationStatuses,
  };
}

export { freshMessageStore, reduceMessageStore, mergeUpdatesWithMessageInfos };
