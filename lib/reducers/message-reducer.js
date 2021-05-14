// @flow

import invariant from 'invariant';
import _difference from 'lodash/fp/difference';
import _flow from 'lodash/fp/flow';
import _isEqual from 'lodash/fp/isEqual';
import _keyBy from 'lodash/fp/keyBy';
import _map from 'lodash/fp/map';
import _mapKeys from 'lodash/fp/mapKeys';
import _mapValues from 'lodash/fp/mapValues';
import _omit from 'lodash/fp/omit';
import _omitBy from 'lodash/fp/omitBy';
import _pick from 'lodash/fp/pick';
import _pickBy from 'lodash/fp/pickBy';
import _uniq from 'lodash/fp/uniq';

import {
  createEntryActionTypes,
  saveEntryActionTypes,
  deleteEntryActionTypes,
  restoreEntryActionTypes,
} from '../actions/entry-actions';
import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMostRecentMessagesActionTypes,
  sendTextMessageActionTypes,
  sendMultimediaMessageActionTypes,
  saveMessagesActionType,
  processMessagesActionType,
  messageStorePruneActionType,
  createLocalMessageActionType,
} from '../actions/message-actions';
import {
  changeThreadSettingsActionTypes,
  deleteThreadActionTypes,
  leaveThreadActionTypes,
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  joinThreadActionTypes,
} from '../actions/thread-actions';
import { updateMultimediaMessageMediaActionType } from '../actions/upload-actions';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  resetPasswordActionTypes,
  registerActionTypes,
} from '../actions/user-actions';
import { pendingToRealizedThreadIDsSelector } from '../selectors/thread-selectors';
import {
  messageID,
  combineTruncationStatuses,
  sortMessageInfoList,
  sortMessageIDs,
} from '../shared/message-utils';
import {
  threadHasPermission,
  threadInChatList,
  threadIsPending,
} from '../shared/thread-utils';
import threadWatcher from '../shared/thread-watcher';
import { unshimMessageInfos } from '../shared/unshim-utils';
import {
  type RawMessageInfo,
  type LocalMessageInfo,
  type MessageStore,
  type MessageTruncationStatus,
  type ThreadMessageInfo,
  type LocallyComposedMessageInfo,
  type RawMultimediaMessageInfo,
  type MessageTruncationStatuses,
  messageTruncationStatus,
  messageTypes,
  defaultNumberPerThread,
} from '../types/message-types';
import type { RawImagesMessageInfo } from '../types/messages/images';
import type { RawMediaMessageInfo } from '../types/messages/media';
import type { RawTextMessageInfo } from '../types/messages/text';
import { type BaseAction, rehydrateActionType } from '../types/redux-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';
import { type RawThreadInfo, threadPermissions } from '../types/thread-types';
import {
  updateTypes,
  type UpdateInfo,
  processUpdatesActionType,
} from '../types/update-types';
import { setNewSessionActionType } from '../utils/action-utils';

const _mapValuesWithKeys = _mapValues.convert({ cap: false });

// Input must already be ordered!
function threadsToMessageIDsFromMessageInfos(
  orderedMessageInfos: $ReadOnlyArray<RawMessageInfo>,
): { [threadID: string]: string[] } {
  const threads: { [threadID: string]: string[] } = {};
  for (const messageInfo of orderedMessageInfos) {
    const key = messageID(messageInfo);
    if (!threads[messageInfo.threadID]) {
      threads[messageInfo.threadID] = [key];
    } else {
      threads[messageInfo.threadID].push(key);
    }
  }
  return threads;
}

function threadIsWatched(
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

function freshMessageStore(
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatus: { [threadID: string]: MessageTruncationStatus },
  currentAsOf: number,
  threadInfos: { [threadID: string]: RawThreadInfo },
): MessageStore {
  const unshimmed = unshimMessageInfos(messageInfos);
  const orderedMessageInfos = sortMessageInfoList(unshimmed);
  const messages = _keyBy(messageID)(orderedMessageInfos);
  const threadsToMessageIDs = threadsToMessageIDsFromMessageInfos(
    orderedMessageInfos,
  );
  const lastPruned = Date.now();
  const threads = _mapValuesWithKeys(
    (messageIDs: string[], threadID: string) => ({
      messageIDs,
      startReached:
        truncationStatus[threadID] === messageTruncationStatus.EXHAUSTIVE,
      lastNavigatedTo: 0,
      lastPruned,
    }),
  )(threadsToMessageIDs);
  const watchedIDs = threadWatcher.getWatchedIDs();
  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    if (
      threads[threadID] ||
      !threadIsWatched(threadID, threadInfo, watchedIDs)
    ) {
      continue;
    }
    threads[threadID] = {
      messageIDs: [],
      // We can conclude that startReached, since no messages were returned
      startReached: true,
      lastNavigatedTo: 0,
      lastPruned,
    };
  }
  return { messages, threads, local: {}, currentAsOf };
}

function reassignMessagesToRealizedThreads(
  messageStore: MessageStore,
  threadInfos: { +[threadID: string]: RawThreadInfo },
): MessageStore {
  const pendingToRealizedThreadIDs = pendingToRealizedThreadIDsSelector(
    threadInfos,
  );

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
  }

  const threads = {};
  for (const threadID in messageStore.threads) {
    const threadMessageInfo = messageStore.threads[threadID];
    const newThreadID = pendingToRealizedThreadIDs.get(threadID);
    if (!newThreadID) {
      threads[threadID] = threadMessageInfo;
      continue;
    }
    const realizedThread = messageStore.threads[newThreadID];
    if (!realizedThread) {
      threads[newThreadID] = threadMessageInfo;
      continue;
    }
    // This is the first time we see a thread, and yet it's already present
    // in message store. It means that something went wrong.
    invariant(false, 'Message store should not contain a new thread');
  }

  return {
    ...messageStore,
    threads,
    messages,
  };
}

// oldMessageStore is from the old state
// newMessageInfos, truncationStatus come from server
function mergeNewMessages(
  oldMessageStore: MessageStore,
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatus: { [threadID: string]: MessageTruncationStatus },
  threadInfos: { [threadID: string]: RawThreadInfo },
  actionType: *,
): MessageStore {
  const messageStoreAfterReassignment = reassignMessagesToRealizedThreads(
    oldMessageStore,
    threadInfos,
  );
  const unshimmed = unshimMessageInfos(newMessageInfos);
  const localIDsToServerIDs: Map<string, string> = new Map();
  const orderedNewMessageInfos = _flow(
    _map((messageInfo: RawMessageInfo) => {
      const { id: inputID } = messageInfo;
      invariant(inputID, 'new messageInfos should have serverID');
      invariant(
        !threadIsPending(messageInfo.threadID),
        'new messageInfos should have realized thread id',
      );
      const currentMessageInfo =
        messageStoreAfterReassignment.messages[inputID];
      if (
        messageInfo.type === messageTypes.TEXT ||
        messageInfo.type === messageTypes.IMAGES ||
        messageInfo.type === messageTypes.MULTIMEDIA
      ) {
        const { localID: inputLocalID } = messageInfo;
        const currentLocalMessageInfo = inputLocalID
          ? messageStoreAfterReassignment.messages[inputLocalID]
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
          invariant(inputLocalID, 'should be set');
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
  )(unshimmed);

  const threadsToMessageIDs = threadsToMessageIDsFromMessageInfos(
    orderedNewMessageInfos,
  );
  const oldMessageInfosToCombine = [];
  const mustResortThreadMessageIDs = [];
  const lastPruned = Date.now();
  const watchedIDs = threadWatcher.getWatchedIDs();
  const local = {};
  const threads = _flow(
    _pickBy((messageIDs: string[], threadID: string) =>
      threadIsWatched(threadID, threadInfos[threadID], watchedIDs),
    ),
    _mapValuesWithKeys((messageIDs: string[], threadID: string) => {
      const oldThread = messageStoreAfterReassignment.threads[threadID];
      const truncate = truncationStatus[threadID];
      if (!oldThread) {
        if (actionType === fetchMessagesBeforeCursorActionTypes.success) {
          // Well, this is weird. Somehow fetchMessagesBeforeCursor got called
          // for a thread that doesn't exist in the messageStore. How did this
          // happen? How do we even know what cursor to use if we didn't have
          // any messages? Anyways, the messageStore is predicated on the
          // principle that it is current. We can't create a ThreadMessageInfo
          // for a thread if we can't guarantee this, as the client has no UX
          // for endReached, only for startReached. We'll have to bail out here.
          return null;
        }
        return {
          messageIDs,
          startReached: truncate === messageTruncationStatus.EXHAUSTIVE,
          lastNavigatedTo: 0,
          lastPruned,
        };
      }
      let oldMessageIDsUnchanged = true;
      const oldMessageIDs = oldThread.messageIDs.map((oldID) => {
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
        return {
          messageIDs,
          startReached: false,
          lastNavigatedTo: oldThread.lastNavigatedTo,
          lastPruned: oldThread.lastPruned,
        };
      }
      const oldNotInNew = _difference(oldMessageIDs)(messageIDs);
      for (const id of oldNotInNew) {
        const oldMessageInfo = messageStoreAfterReassignment.messages[id];
        invariant(oldMessageInfo, `could not find ${id} in messageStore`);
        oldMessageInfosToCombine.push(oldMessageInfo);
        const localInfo = messageStoreAfterReassignment.local[id];
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
        return {
          messageIDs: oldMessageIDs,
          startReached,
          lastNavigatedTo: oldThread.lastNavigatedTo,
          lastPruned: oldThread.lastPruned,
        };
      }
      const mergedMessageIDs = [...messageIDs, ...oldNotInNew];
      mustResortThreadMessageIDs.push(threadID);
      return {
        messageIDs: mergedMessageIDs,
        startReached,
        lastNavigatedTo: oldThread.lastNavigatedTo,
        lastPruned: oldThread.lastPruned,
      };
    }),
    _pickBy((thread) => !!thread),
  )(threadsToMessageIDs);

  for (const threadID in messageStoreAfterReassignment.threads) {
    if (
      threads[threadID] ||
      !threadIsWatched(threadID, threadInfos[threadID], watchedIDs)
    ) {
      continue;
    }
    let thread = messageStoreAfterReassignment.threads[threadID];
    const truncate = truncationStatus[threadID];
    if (truncate === messageTruncationStatus.EXHAUSTIVE) {
      thread = {
        ...thread,
        startReached: true,
      };
    }
    threads[threadID] = thread;
    for (const id of thread.messageIDs) {
      const messageInfo = messageStoreAfterReassignment.messages[id];
      if (messageInfo) {
        oldMessageInfosToCombine.push(messageInfo);
      }
      const localInfo = messageStoreAfterReassignment.local[id];
      if (localInfo) {
        local[id] = localInfo;
      }
    }
  }

  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    if (
      threads[threadID] ||
      !threadIsWatched(threadID, threadInfo, watchedIDs)
    ) {
      continue;
    }
    threads[threadID] = {
      messageIDs: [],
      // We can conclude that startReached, since no messages were returned
      startReached: true,
      lastNavigatedTo: 0,
      lastPruned,
    };
  }

  const messages = _flow(
    sortMessageInfoList,
    _keyBy(messageID),
  )([...orderedNewMessageInfos, ...oldMessageInfosToCombine]);

  for (const threadID of mustResortThreadMessageIDs) {
    threads[threadID].messageIDs = sortMessageIDs(messages)(
      threads[threadID].messageIDs,
    );
  }

  const currentAsOf = Math.max(
    orderedNewMessageInfos.length > 0 ? orderedNewMessageInfos[0].time : 0,
    messageStoreAfterReassignment.currentAsOf,
  );

  return { messages, threads, local, currentAsOf };
}

function filterByNewThreadInfos(
  messageStore: MessageStore,
  threadInfos: { [id: string]: RawThreadInfo },
): MessageStore {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const watchedThreadInfos = _pickBy((threadInfo: RawThreadInfo) =>
    threadIsWatched(threadInfo.id, threadInfo, watchedIDs),
  )(threadInfos);
  const messageIDsToRemove = [];
  for (const threadID in messageStore.threads) {
    if (watchedThreadInfos[threadID]) {
      continue;
    }
    for (const id of messageStore.threads[threadID].messageIDs) {
      messageIDsToRemove.push(id);
    }
  }
  return {
    messages: _omit(messageIDsToRemove)(messageStore.messages),
    threads: _pick(Object.keys(watchedThreadInfos))(messageStore.threads),
    local: _omit(messageIDsToRemove)(messageStore.local),
    currentAsOf: messageStore.currentAsOf,
  };
}

function ensureRealizedThreadIDIsUsedWhenPossible<
  T: RawTextMessageInfo | RawMultimediaMessageInfo | LocallyComposedMessageInfo,
>(payload: T, threadInfos: { [id: string]: RawThreadInfo }): T {
  const pendingToRealizedThreadIDs = pendingToRealizedThreadIDsSelector(
    threadInfos,
  );
  const realizedThreadID = pendingToRealizedThreadIDs.get(payload.threadID);
  return realizedThreadID
    ? { ...payload, threadID: realizedThreadID }
    : payload;
}

function reduceMessageStore(
  messageStore: MessageStore,
  action: BaseAction,
  newThreadInfos: { [id: string]: RawThreadInfo },
): MessageStore {
  if (
    action.type === logInActionTypes.success ||
    action.type === resetPasswordActionTypes.success
  ) {
    const messagesResult = action.payload.messagesResult;
    return freshMessageStore(
      messagesResult.messageInfos,
      messagesResult.truncationStatus,
      messagesResult.currentAsOf,
      newThreadInfos,
    );
  } else if (action.type === incrementalStateSyncActionType) {
    if (
      action.payload.messagesResult.rawMessageInfos.length === 0 &&
      action.payload.updatesResult.newUpdates.length === 0
    ) {
      return messageStore;
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
      return messageStore;
    }

    const messagesResult = mergeUpdatesWithMessageInfos(
      [],
      action.payload.updatesResult.newUpdates,
    );
    if (Object.keys(messagesResult.truncationStatuses).length === 0) {
      return messageStore;
    }

    const newMessageStore = mergeNewMessages(
      messageStore,
      messagesResult.rawMessageInfos,
      messagesResult.truncationStatuses,
      newThreadInfos,
      action.type,
    );
    return {
      messages: newMessageStore.messages,
      threads: newMessageStore.threads,
      local: newMessageStore.local,
      currentAsOf: messageStore.currentAsOf,
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
    return filterByNewThreadInfos(messageStore, newThreadInfos);
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
    action.type === changeThreadMemberRolesActionTypes.success
  ) {
    return mergeNewMessages(
      messageStore,
      action.payload.newMessageInfos,
      { [action.payload.threadID]: messageTruncationStatus.UNCHANGED },
      newThreadInfos,
      action.type,
    );
  } else if (
    action.type === createEntryActionTypes.success ||
    action.type === saveEntryActionTypes.success
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
  } else if (action.type === restoreEntryActionTypes.success) {
    const { threadID } = action.payload;
    return mergeNewMessages(
      messageStore,
      action.payload.newMessageInfos,
      { [threadID]: messageTruncationStatus.UNCHANGED },
      newThreadInfos,
      action.type,
    );
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
  } else if (
    action.type === sendTextMessageActionTypes.started ||
    action.type === sendMultimediaMessageActionTypes.started
  ) {
    const payload = ensureRealizedThreadIDIsUsedWhenPossible(
      action.payload,
      newThreadInfos,
    );
    const { localID, threadID } = payload;
    invariant(localID, `localID should be set on ${action.type}`);

    const now = Date.now();
    const messageIDs = messageStore.threads[threadID]?.messageIDs ?? [];
    if (messageStore.messages[localID]) {
      const messages = { ...messageStore.messages, [localID]: payload };
      const local = _pickBy(
        (localInfo: LocalMessageInfo, key: string) => key !== localID,
      )(messageStore.local);
      const thread = messageStore.threads[threadID];
      const threads = {
        ...messageStore.threads,
        [threadID]: {
          messageIDs: sortMessageIDs(messages)(messageIDs),
          startReached: thread?.startReached ?? true,
          lastNavigatedTo: thread?.lastNavigatedTo ?? now,
          lastPruned: thread?.lastPruned ?? now,
        },
      };
      return { ...messageStore, messages, threads, local };
    }

    for (const existingMessageID of messageIDs) {
      const existingMessageInfo = messageStore.messages[existingMessageID];
      if (existingMessageInfo && existingMessageInfo.localID === localID) {
        return messageStore;
      }
    }

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
    return {
      messages: {
        ...messageStore.messages,
        [localID]: payload,
      },
      threads: {
        ...messageStore.threads,
        [threadID]: threadState,
      },
      local: messageStore.local,
      currentAsOf: messageStore.currentAsOf,
    };
  } else if (
    action.type === sendTextMessageActionTypes.failed ||
    action.type === sendMultimediaMessageActionTypes.failed
  ) {
    const { localID } = action.payload;
    return {
      messages: messageStore.messages,
      threads: messageStore.threads,
      local: {
        ...messageStore.local,
        [localID]: { sendFailed: true },
      },
      currentAsOf: messageStore.currentAsOf,
    };
  } else if (
    action.type === sendTextMessageActionTypes.success ||
    action.type === sendMultimediaMessageActionTypes.success
  ) {
    const { payload } = action;
    invariant(
      !threadIsPending(payload.threadID),
      'Successful message action should have realized thread id',
    );
    const replaceMessageKey = (messageKey: string) =>
      messageKey === payload.localID ? payload.serverID : messageKey;
    let newMessages;
    if (messageStore.messages[payload.serverID]) {
      // If somehow the serverID got in there already, we'll just update the
      // serverID message and scrub the localID one
      newMessages = _omitBy(
        (messageInfo: RawMessageInfo) =>
          messageInfo.type === messageTypes.TEXT &&
          !messageInfo.id &&
          messageInfo.localID === payload.localID,
      )(messageStore.messages);
    } else if (messageStore.messages[payload.localID]) {
      // The normal case, the localID message gets replaced by the serverID one
      newMessages = _mapKeys(replaceMessageKey)(messageStore.messages);
    } else {
      // Well this is weird, we probably got deauthorized between when the
      // action was dispatched and when we ran this reducer...
      return messageStore;
    }
    newMessages[payload.serverID] = {
      ...newMessages[payload.serverID],
      id: payload.serverID,
      localID: payload.localID,
      time: payload.time,
    };
    const threadID = payload.threadID;
    const newMessageIDs = _flow(
      _uniq,
      sortMessageIDs(newMessages),
    )(messageStore.threads[threadID].messageIDs.map(replaceMessageKey));
    const currentAsOf =
      payload.interface === 'socket'
        ? Math.max(payload.time, messageStore.currentAsOf)
        : messageStore.currentAsOf;
    const local = _pickBy(
      (localInfo: LocalMessageInfo, key: string) => key !== payload.localID,
    )(messageStore.local);
    return {
      messages: newMessages,
      threads: {
        ...messageStore.threads,
        [threadID]: {
          ...messageStore.threads[threadID],
          messageIDs: newMessageIDs,
        },
      },
      local,
      currentAsOf,
    };
  } else if (action.type === saveMessagesActionType) {
    const truncationStatuses = {};
    for (const messageInfo of action.payload.rawMessageInfos) {
      truncationStatuses[messageInfo.threadID] =
        messageTruncationStatus.UNCHANGED;
    }
    const newMessageStore = mergeNewMessages(
      messageStore,
      action.payload.rawMessageInfos,
      truncationStatuses,
      newThreadInfos,
      action.type,
    );
    return {
      messages: newMessageStore.messages,
      threads: newMessageStore.threads,
      local: newMessageStore.local,
      // We avoid bumping currentAsOf because notifs may include a contracted
      // RawMessageInfo, so we want to make sure we still fetch it
      currentAsOf: messageStore.currentAsOf,
    };
  } else if (action.type === messageStorePruneActionType) {
    const now = Date.now();
    const messageIDsToPrune = [];

    const newThreads = { ...messageStore.threads };
    for (const threadID of action.payload.threadIDs) {
      let thread = newThreads[threadID];
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

      newThreads[threadID] = thread;
    }

    return {
      messages: _omit(messageIDsToPrune)(messageStore.messages),
      threads: newThreads,
      local: _omit(messageIDsToPrune)(messageStore.local),
      currentAsOf: messageStore.currentAsOf,
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

    let replaced = false;
    const media = [];
    for (const singleMedia of message.media) {
      if (singleMedia.id !== currentMediaID) {
        media.push(singleMedia);
      } else if (singleMedia.type === 'photo') {
        replaced = true;
        media.push({
          ...singleMedia,
          ...mediaUpdate,
        });
      } else if (singleMedia.type === 'video') {
        replaced = true;
        media.push({
          ...singleMedia,
          ...mediaUpdate,
        });
      }
    }
    invariant(
      replaced,
      `message ${id} did not contain media with ID ${currentMediaID}`,
    );

    return {
      ...messageStore,
      messages: {
        ...messageStore.messages,
        [id]: {
          ...message,
          media,
        },
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
    return {
      ...messageStore,
      messages: {
        ...messageStore.messages,
        [localID]: messageInfo,
      },
      threads: {
        ...messageStore.threads,
        [threadID]: threadState,
      },
    };
  } else if (action.type === rehydrateActionType) {
    // When starting the app on native, we filter out any local-only multimedia
    // messages because the relevant context is no longer available
    const { messages, threads, local } = messageStore;

    const newMessages = {};
    let newThreads = threads,
      newLocal = local;
    for (const id in messages) {
      const message = messages[id];
      if (
        (message.type !== messageTypes.IMAGES &&
          message.type !== messageTypes.MULTIMEDIA) ||
        message.id
      ) {
        newMessages[id] = message;
        continue;
      }
      const { threadID } = message;
      newThreads = {
        ...newThreads,
        [threadID]: {
          ...newThreads[threadID],
          messageIDs: newThreads[threadID].messageIDs.filter(
            (curMessageID) => curMessageID !== id,
          ),
        },
      };
      newLocal = _pickBy(
        (localInfo: LocalMessageInfo, key: string) => key !== id,
      )(newLocal);
    }

    if (newThreads === threads) {
      return messageStore;
    }
    return {
      ...messageStore,
      messages: newMessages,
      threads: newThreads,
      local: newLocal,
    };
  }
  return messageStore;
}

type MergedUpdatesWithMessages = {|
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
|};
function mergeUpdatesWithMessageInfos(
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
  truncationStatuses?: MessageTruncationStatuses,
): MergedUpdatesWithMessages {
  const messageIDs = new Set(messageInfos.map((messageInfo) => messageInfo.id));
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

    mergedTruncationStatuses[
      updateInfo.threadInfo.id
    ] = combineTruncationStatuses(
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
