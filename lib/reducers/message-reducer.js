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
  createEntryActionTypes,
  saveEntryActionTypes,
  deleteEntryActionTypes,
  restoreEntryActionTypes,
} from '../actions/entry-actions.js';
import {
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
} from '../actions/message-actions.js';
import { sendMessageReportActionTypes } from '../actions/message-report-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  changeThreadSettingsActionTypes,
  deleteThreadActionTypes,
  leaveThreadActionTypes,
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  joinThreadActionTypes,
  toggleMessagePinActionTypes,
} from '../actions/thread-actions.js';
import { updateMultimediaMessageMediaActionType } from '../actions/upload-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
} from '../actions/user-actions.js';
import { pendingToRealizedThreadIDsSelector } from '../selectors/thread-selectors.js';
import {
  messageID,
  combineTruncationStatuses,
  sortMessageInfoList,
  sortMessageIDs,
  mergeThreadMessageInfos,
} from '../shared/message-utils.js';
import {
  threadHasPermission,
  threadInChatList,
  threadIsPending,
} from '../shared/thread-utils.js';
import threadWatcher from '../shared/thread-watcher.js';
import { unshimMessageInfos } from '../shared/unshim-utils.js';
import type { Media, Image } from '../types/media-types.js';
import {
  type RawMessageInfo,
  type LocalMessageInfo,
  type MessageStore,
  type ReplaceMessageOperation,
  type MessageStoreOperation,
  type MessageTruncationStatus,
  type MessageTruncationStatuses,
  messageTruncationStatus,
  messageTypes,
  defaultNumberPerThread,
  type ThreadMessageInfo,
} from '../types/message-types.js';
import type { RawImagesMessageInfo } from '../types/messages/images.js';
import type { RawMediaMessageInfo } from '../types/messages/media.js';
import { type BaseAction } from '../types/redux-types.js';
import { processServerRequestsActionType } from '../types/request-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import {
  type RawThreadInfo,
  threadPermissions,
} from '../types/thread-types.js';
import {
  updateTypes,
  type ClientUpdateInfo,
  processUpdatesActionType,
} from '../types/update-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';
import { isDev } from '../utils/dev-utils.js';
import {
  translateClientDBMessageInfosToRawMessageInfos,
  translateClientDBThreadMessageInfos,
} from '../utils/message-ops-utils.js';
import { assertObjectsAreEqual } from '../utils/objects.js';

const PROCESSED_MSG_STORE_INVARIANTS_DISABLED = !isDev;
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
  threadInfo: ?RawThreadInfo,
  watchedIDs: $ReadOnlyArray<string>,
) {
  return (
    threadIsPending(threadID) ||
    (threadInfo &&
      threadHasPermission(threadInfo, threadPermissions.VISIBLE) &&
      (threadInChatList(threadInfo) || watchedIDs.includes(threadID)))
  );
}

function assertMessageStoreThreadsAreEqual(
  processedMessageStore: MessageStore,
  expectedMessageStore: MessageStore,
  location: string,
) {
  if (PROCESSED_MSG_STORE_INVARIANTS_DISABLED) {
    return;
  }

  assertObjectsAreEqual(
    processedMessageStore.threads,
    expectedMessageStore.threads,
    `MessageStore.threads - ${location}`,
  );
}

const newThread = () => ({
  messageIDs: [],
  startReached: false,
  lastNavigatedTo: 0,
  lastPruned: Date.now(),
});

type FreshMessageStoreResult = {
  +messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
  +messageStore: MessageStore,
};
function freshMessageStore(
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatus: { [threadID: string]: MessageTruncationStatus },
  currentAsOf: number,
  threadInfos: { +[threadID: string]: RawThreadInfo },
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
      type: 'replace_threads',
      payload: { threads },
    },
    ...messageStoreReplaceOperations,
  ];

  return {
    messageStoreOperations,
    messageStore: { messages, threads, local: {}, currentAsOf },
  };
}

type ReassignmentResult = {
  +messageStoreOperations: MessageStoreOperation[],
  +messageStore: MessageStore,
  +reassignedThreadIDs: string[],
};

function reassignMessagesToRealizedThreads(
  messageStore: MessageStore,
  threadInfos: { +[threadID: string]: RawThreadInfo },
): ReassignmentResult {
  const pendingToRealizedThreadIDs =
    pendingToRealizedThreadIDsSelector(threadInfos);

  const messageStoreOperations: MessageStoreOperation[] = [];
  const messages = {};
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

  const threads = {};
  const reassignedThreadIDs = [];
  const updatedThreads = {};
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
  messageStoreOperations.push({
    type: 'replace_threads',
    payload: {
      threads: updatedThreads,
    },
  });

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
  truncationStatus: { [threadID: string]: MessageTruncationStatus },
  threadInfos: { +[threadID: string]: RawThreadInfo },
  actionType: string,
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

  assertMessageStoreThreadsAreEqual(
    messageStoreAfterUpdateOps,
    messageStoreUpdatedWithLatestThreadInfos,
    `${actionType} | reassignment and filtering`,
  );

  const updatedMessageStore = {
    ...messageStoreUpdatedWithLatestThreadInfos,
    messages: messageStoreAfterUpdateOps.messages,
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
  const local = {};
  const updatedThreads = {};
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
          lastNavigatedTo: oldThread.lastNavigatedTo,
          lastPruned: oldThread.lastPruned,
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
          local[id] = localInfo;
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
          lastNavigatedTo: oldThread.lastNavigatedTo,
          lastPruned: oldThread.lastPruned,
        };
        return updatedThreads[threadID];
      }
      const mergedMessageIDs = [...messageIDs, ...oldNotInNew];
      threadsThatNeedMessageIDsResorted.push(threadID);
      return {
        messageIDs: mergedMessageIDs,
        startReached,
        lastNavigatedTo: oldThread.lastNavigatedTo,
        lastPruned: oldThread.lastPruned,
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
        local[id] = localInfo;
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

  const currentAsOf = Math.max(
    orderedNewMessageInfos.length > 0 ? orderedNewMessageInfos[0].time : 0,
    updatedMessageStore.currentAsOf,
  );

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

  const messageStore = {
    messages: processedMessageStore.messages,
    threads,
    local,
    currentAsOf,
  };

  assertMessageStoreThreadsAreEqual(
    processedMessageStore,
    messageStore,
    `${actionType} | processed`,
  );

  return {
    messageStoreOperations: [
      ...updateWithLatestThreadInfosOps,
      ...newMessageOps,
    ],
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
  threadInfos: { +[id: string]: RawThreadInfo },
): UpdateMessageStoreWithLatestThreadInfosResult {
  const messageStoreOperations: MessageStoreOperation[] = [];
  const {
    messageStore: reassignedMessageStore,
    messageStoreOperations: reassignMessagesOps,
    reassignedThreadIDs,
  } = reassignMessagesToRealizedThreads(messageStore, threadInfos);
  messageStoreOperations.push(...reassignMessagesOps);
  const watchedIDs = [...threadWatcher.getWatchedIDs(), ...reassignedThreadIDs];
  const watchedThreadInfos = _pickBy((threadInfo: RawThreadInfo) =>
    isThreadWatched(threadInfo.id, threadInfo, watchedIDs),
  )(threadInfos);

  const filteredThreads = _pick(Object.keys(watchedThreadInfos))(
    reassignedMessageStore.threads,
  );

  const messageIDsToRemove = [];
  const threadsToRemoveMessagesFrom = [];
  for (const threadID in reassignedMessageStore.threads) {
    if (watchedThreadInfos[threadID]) {
      continue;
    }
    threadsToRemoveMessagesFrom.push(threadID);
    for (const id of reassignedMessageStore.threads[threadID].messageIDs) {
      messageIDsToRemove.push(id);
    }
  }

  const updatedThreads = {};
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
  threadInfos: { +[id: string]: RawThreadInfo },
): T {
  const pendingToRealizedThreadIDs =
    pendingToRealizedThreadIDsSelector(threadInfos);
  const realizedThreadID = pendingToRealizedThreadIDs.get(payload.threadID);
  return realizedThreadID
    ? { ...payload, threadID: realizedThreadID }
    : payload;
}

function processMessageStoreOperations(
  messageStore: MessageStore,
  messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
): MessageStore {
  if (messageStoreOperations.length === 0) {
    return messageStore;
  }
  let processedMessages = { ...messageStore.messages };
  let processedThreads = { ...messageStore.threads };
  for (const operation of messageStoreOperations) {
    if (operation.type === 'replace') {
      processedMessages[operation.payload.id] = operation.payload.messageInfo;
    } else if (operation.type === 'remove') {
      for (const id of operation.payload.ids) {
        delete processedMessages[id];
      }
    } else if (operation.type === 'remove_messages_for_threads') {
      for (const msgID in processedMessages) {
        if (
          operation.payload.threadIDs.includes(
            processedMessages[msgID].threadID,
          )
        ) {
          delete processedMessages[msgID];
        }
      }
    } else if (operation.type === 'rekey') {
      processedMessages[operation.payload.to] =
        processedMessages[operation.payload.from];
      delete processedMessages[operation.payload.from];
    } else if (operation.type === 'remove_all') {
      processedMessages = {};
    } else if (operation.type === 'replace_threads') {
      for (const threadID in operation.payload.threads) {
        processedThreads[threadID] = operation.payload.threads[threadID];
      }
    } else if (operation.type === 'remove_threads') {
      for (const id of operation.payload.ids) {
        delete processedThreads[id];
      }
    } else if (operation.type === 'remove_all_threads') {
      processedThreads = {};
    }
  }
  return {
    ...messageStore,
    threads: processedThreads,
    messages: processedMessages,
  };
}

type ReduceMessageStoreResult = {
  +messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
  +messageStore: MessageStore,
};
function reduceMessageStore(
  messageStore: MessageStore,
  action: BaseAction,
  newThreadInfos: { +[id: string]: RawThreadInfo },
): ReduceMessageStoreResult {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success
  ) {
    const messagesResult = action.payload.messagesResult;
    const { messageStoreOperations, messageStore: freshStore } =
      freshMessageStore(
        messagesResult.messageInfos,
        messagesResult.truncationStatus,
        messagesResult.currentAsOf,
        newThreadInfos,
      );

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    assertMessageStoreThreadsAreEqual(
      processedMessageStore,
      freshStore,
      `${action.type} | fresh store`,
    );

    return {
      messageStoreOperations,
      messageStore: { ...freshStore, messages: processedMessageStore.messages },
    };
  } else if (action.type === incrementalStateSyncActionType) {
    if (
      action.payload.messagesResult.rawMessageInfos.length === 0 &&
      action.payload.updatesResult.newUpdates.length === 0
    ) {
      return { messageStoreOperations: [], messageStore };
    }

    const messagesResult = mergeUpdatesWithMessageInfos(
      action.payload.messagesResult.rawMessageInfos,
      action.payload.updatesResult.newUpdates,
      action.payload.messagesResult.truncationStatuses,
    );

    return mergeNewMessages(
      messageStore,
      messagesResult.rawMessageInfos,
      messagesResult.truncationStatuses,
      newThreadInfos,
      action.type,
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
        action.type,
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
    action.type === processMessagesActionType
  ) {
    const { messagesResult } = action.payload;
    return mergeNewMessages(
      messageStore,
      messagesResult.rawMessageInfos,
      messagesResult.truncationStatuses,
      newThreadInfos,
      action.type,
    );
  } else if (
    action.type === fetchSingleMostRecentMessagesFromThreadsActionTypes.success
  ) {
    return mergeNewMessages(
      messageStore,
      action.payload.rawMessageInfos,
      action.payload.truncationStatuses,
      newThreadInfos,
      action.type,
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
      action.type,
    );
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
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

    assertMessageStoreThreadsAreEqual(
      processedMessageStore,
      filteredMessageStore,
      action.type,
    );

    return {
      messageStoreOperations,
      messageStore: {
        ...filteredMessageStore,
        messages: processedMessageStore.messages,
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
      action.type,
    );
  } else if (action.type === sendMessageReportActionTypes.success) {
    return mergeNewMessages(
      messageStore,
      [action.payload.messageInfo],
      {
        [action.payload.messageInfo.threadID]:
          messageTruncationStatus.UNCHANGED,
      },
      newThreadInfos,
      action.type,
    );
  } else if (action.type === registerActionTypes.success) {
    const truncationStatuses = {};
    for (const messageInfo of action.payload.rawMessageInfos) {
      truncationStatuses[messageInfo.threadID] =
        messageTruncationStatus.EXHAUSTIVE;
    }
    return mergeNewMessages(
      messageStore,
      action.payload.rawMessageInfos,
      truncationStatuses,
      newThreadInfos,
      action.type,
    );
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
      { [action.payload.threadID]: messageTruncationStatus.UNCHANGED },
      newThreadInfos,
      action.type,
    );
  } else if (action.type === deleteEntryActionTypes.success) {
    const payload = action.payload;
    if (payload) {
      return mergeNewMessages(
        messageStore,
        payload.newMessageInfos,
        { [payload.threadID]: messageTruncationStatus.UNCHANGED },
        newThreadInfos,
        action.type,
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
      action.type,
    );
  } else if (action.type === sendEditMessageActionTypes.success) {
    const { newMessageInfos } = action.payload;
    const truncationStatuses = {};
    for (const messageInfo of newMessageInfos) {
      truncationStatuses[messageInfo.threadID] =
        messageTruncationStatus.UNCHANGED;
    }
    return mergeNewMessages(
      messageStore,
      newMessageInfos,
      truncationStatuses,
      newThreadInfos,
      action.type,
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

    const messageStoreOperations = [
      {
        type: 'replace',
        payload: { id: localID, messageInfo: payload },
      },
    ];

    const now = Date.now();
    let updatedThreads;
    let local = { ...messageStore.local };
    if (messageStore.messages[localID]) {
      const messages = { ...messageStore.messages, [localID]: payload };
      local = _pickBy(
        (localInfo: LocalMessageInfo, key: string) => key !== localID,
      )(messageStore.local);
      const thread = messageStore.threads[threadID];
      updatedThreads = {
        [threadID]: {
          messageIDs: sortMessageIDs(messages)(messageIDs),
          startReached: thread?.startReached ?? true,
          lastNavigatedTo: thread?.lastNavigatedTo ?? now,
          lastPruned: thread?.lastPruned ?? now,
        },
      };
    } else {
      updatedThreads = {
        [threadID]: messageStore.threads[threadID]
          ? {
              ...messageStore.threads[threadID],
              messageIDs: [localID, ...messageIDs],
            }
          : {
              messageIDs: [localID],
              startReached: true,
              lastNavigatedTo: now,
              lastPruned: now,
            },
      };
    }

    const threads = {
      ...messageStore.threads,
      ...updatedThreads,
    };
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
      threads,
      local,
      currentAsOf: messageStore.currentAsOf,
    };

    assertMessageStoreThreadsAreEqual(
      processedMessageStore,
      newMessageStore,
      action.type,
    );

    return {
      messageStoreOperations,
      messageStore: newMessageStore,
    };
  } else if (
    action.type === sendTextMessageActionTypes.failed ||
    action.type === sendMultimediaMessageActionTypes.failed
  ) {
    const { localID } = action.payload;
    return {
      messageStoreOperations: [],
      messageStore: {
        messages: messageStore.messages,
        threads: messageStore.threads,
        local: {
          ...messageStore.local,
          [localID]: { sendFailed: true },
        },
        currentAsOf: messageStore.currentAsOf,
      },
    };
  } else if (action.type === sendReactionMessageActionTypes.failed) {
    const { localID, threadID } = action.payload;
    const messageStoreOperations = [];

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

    const newMessageStore = {
      ...processedMessageStore,
      threads: {
        ...messageStore.threads,
        ...updatedThreads,
      },
    };

    assertMessageStoreThreadsAreEqual(
      processedMessageStore,
      newMessageStore,
      action.type,
    );

    return {
      messageStoreOperations,
      messageStore: newMessageStore,
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
    const messageStoreOperations = [];
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
    const local = _pickBy(
      (localInfo: LocalMessageInfo, key: string) => key !== payload.localID,
    )(messageStore.local);

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

    const newMessageStore = {
      ...messageStore,
      messages: processedMessageStore.messages,
      threads: {
        ...messageStore.threads,
        ...updatedThreads,
      },
      local,
    };

    assertMessageStoreThreadsAreEqual(
      processedMessageStore,
      newMessageStore,
      action.type,
    );

    return {
      messageStoreOperations,
      messageStore: newMessageStore,
    };
  } else if (action.type === saveMessagesActionType) {
    const truncationStatuses = {};
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
        action.type,
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
    const now = Date.now();
    const messageIDsToPrune = [];

    const updatedThreads = {};
    for (const threadID of action.payload.threadIDs) {
      let thread = messageStore.threads[threadID];
      if (!thread) {
        continue;
      }
      thread = { ...thread, lastPruned: now };

      const newMessageIDs = [...thread.messageIDs];
      const removed = newMessageIDs.splice(defaultNumberPerThread);
      if (removed.length > 0) {
        thread = {
          ...thread,
          messageIDs: newMessageIDs,
          startReached: false,
        };
      }
      for (const id of removed) {
        messageIDsToPrune.push(id);
      }

      updatedThreads[threadID] = thread;
    }

    const messageStoreOperations = [
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
    ];

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    const newMessageStore = {
      messages: processedMessageStore.messages,
      threads: {
        ...messageStore.threads,
        ...updatedThreads,
      },
      local: _omit(messageIDsToPrune)(messageStore.local),
      currentAsOf: messageStore.currentAsOf,
    };

    assertMessageStoreThreadsAreEqual(
      processedMessageStore,
      newMessageStore,
      action.type,
    );

    return {
      messageStoreOperations,
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
          media.push({ ...singleMedia, ...mediaUpdate });
          replaced = true;
        } else if (
          singleMedia.type === 'encrypted_video' &&
          mediaUpdate.type === 'encrypted_video'
        ) {
          media.push({ ...singleMedia, ...mediaUpdate });
          replaced = true;
        } else if (
          singleMedia.type === 'photo' &&
          mediaUpdate.type === 'encrypted_photo'
        ) {
          // extract fields that are absent in encrypted_photo type
          const { uri, localMediaSelection, ...original } = singleMedia;
          const { holder, encryptionKey, ...update } = mediaUpdate;
          invariant(
            holder && encryptionKey,
            'holder and encryptionKey are required for encrypted_photo message',
          );
          media.push({
            ...original,
            ...update,
            type: 'encrypted_photo',
            holder,
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
            holder,
            encryptionKey,
            thumbnailHolder,
            thumbnailEncryptionKey,
            ...update
          } = mediaUpdate;
          invariant(
            holder && encryptionKey,
            'holder and encryptionKey are required for encrypted_video message',
          );
          invariant(
            thumbnailHolder && thumbnailEncryptionKey,
            'thumbnailHolder and thumbnailEncryptionKey are required for ' +
              'encrypted_video message',
          );
          media.push({
            ...original,
            ...update,
            type: 'encrypted_video',
            holder,
            encryptionKey,
            thumbnailHolder,
            thumbnailEncryptionKey,
          });
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
    const now = Date.now();
    const threadState: ThreadMessageInfo = messageStore.threads[threadID]
      ? {
          ...messageStore.threads[threadID],
          messageIDs: [localID, ...messageIDs],
        }
      : {
          messageIDs: [localID],
          startReached: true,
          lastNavigatedTo: now,
          lastPruned: now,
        };

    const messageStoreOperations = [
      {
        type: 'replace',
        payload: { id: localID, messageInfo },
      },
      {
        type: 'replace_threads',
        payload: {
          threads: { [threadID]: threadState },
        },
      },
    ];

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    const newMessageStore = {
      ...messageStore,
      threads: {
        ...messageStore.threads,
        [threadID]: threadState,
      },
      messages: processedMessageStore.messages,
    };

    assertMessageStoreThreadsAreEqual(
      processedMessageStore,
      newMessageStore,
      action.type,
    );

    return {
      messageStoreOperations,
      messageStore: newMessageStore,
    };
  } else if (action.type === processServerRequestsActionType) {
    const {
      messageStoreOperations,
      messageStore: messageStoreAfterReassignment,
    } = reassignMessagesToRealizedThreads(messageStore, newThreadInfos);

    const processedMessageStore = processMessageStoreOperations(
      messageStore,
      messageStoreOperations,
    );

    assertMessageStoreThreadsAreEqual(
      processedMessageStore,
      messageStoreAfterReassignment,
      action.type,
    );

    return {
      messageStoreOperations,
      messageStore: {
        ...messageStoreAfterReassignment,
        messages: processedMessageStore.messages,
      },
    };
  } else if (action.type === setClientDBStoreActionType) {
    const actionPayloadMessageStoreThreads =
      translateClientDBThreadMessageInfos(action.payload.messageStoreThreads);

    const newThreads = {};
    for (const threadID in actionPayloadMessageStoreThreads) {
      newThreads[threadID] = {
        ...actionPayloadMessageStoreThreads[threadID],
        messageIDs: messageStore.threads[threadID]?.messageIDs ?? [],
      };
    }

    assertMessageStoreThreadsAreEqual(
      {
        ...messageStore,
        threads: newThreads,
      },
      messageStore,
      `${action.type} | comparing SQLite with redux-persist`,
    );

    const { messageStoreOperations, messageStore: updatedMessageStore } =
      updateMessageStoreWithLatestThreadInfos(messageStore, newThreadInfos);

    let threads = { ...updatedMessageStore.threads };
    let local = { ...updatedMessageStore.local };

    // Store message IDs already contained within threads so that we
    // do not insert duplicates
    const existingMessageIDs = new Set();
    for (const threadID in threads) {
      threads[threadID].messageIDs.forEach(msgID => {
        existingMessageIDs.add(msgID);
      });
    }
    const threadsNeedMsgIDsResorting = new Set();
    const actionPayloadMessages =
      translateClientDBMessageInfosToRawMessageInfos(action.payload.messages);

    // When starting the app on native, we filter out any local-only multimedia
    // messages because the relevant context is no longer available
    const messageIDsToBeRemoved = [];
    for (const id in actionPayloadMessages) {
      const message = actionPayloadMessages[id];
      const { threadID } = message;
      const existingThread = threads[threadID] ?? newThread();
      if (
        (message.type === messageTypes.IMAGES ||
          message.type === messageTypes.MULTIMEDIA) &&
        !message.id
      ) {
        messageIDsToBeRemoved.push(id);
        threads = {
          ...threads,
          [threadID]: {
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
          [threadID]: {
            ...existingThread,
            messageIDs: [...existingThread.messageIDs, id],
          },
        };
        threadsNeedMsgIDsResorting.add(threadID);
      } else if (!threads[threadID]) {
        threads = { ...threads, [threadID]: existingThread };
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

    return {
      messageStoreOperations,
      messageStore: processedMessageStore,
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
  const messageIDs = new Set(messageInfos.map(messageInfo => messageInfo.id));
  const mergedMessageInfos = [...messageInfos];
  const mergedTruncationStatuses = { ...truncationStatuses };

  for (const updateInfo of newUpdates) {
    if (updateInfo.type !== updateTypes.JOIN_THREAD) {
      continue;
    }
    for (const messageInfo of updateInfo.rawMessageInfos) {
      if (messageIDs.has(messageInfo.id)) {
        continue;
      }
      mergedMessageInfos.push(messageInfo);
      messageIDs.add(messageInfo.id);
    }

    mergedTruncationStatuses[updateInfo.threadInfo.id] =
      combineTruncationStatuses(
        updateInfo.truncationStatus,
        mergedTruncationStatuses[updateInfo.threadInfo.id],
      );
  }
  return {
    rawMessageInfos: mergedMessageInfos,
    truncationStatuses: mergedTruncationStatuses,
  };
}

export { freshMessageStore, reduceMessageStore };
