// @flow

import {
  type RawMessageInfo,
  type ThreadMessageInfo,
  type MessageStore,
  type MessageTruncationStatus,
  type MessagesResponse,
  messageTruncationStatus,
  messageTypes,
  defaultNumberPerThread,
} from '../types/message-types';
import type { BaseAction } from '../types/redux-types';
import { type RawThreadInfo, threadPermissions } from '../types/thread-types';
import {
  updateTypes,
  type UpdateInfo,
  processUpdatesActionType,
} from '../types/update-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';

import invariant from 'invariant';
import _flow from 'lodash/fp/flow';
import _map from 'lodash/fp/map';
import _mapValues from 'lodash/fp/mapValues';
const _mapValuesWithKeys = _mapValues.convert({ cap: false });
import _isEqual from 'lodash/fp/isEqual';
import _keyBy from 'lodash/fp/keyBy';
import _orderBy from 'lodash/fp/orderBy';
import _difference from 'lodash/fp/difference';
import _omit from 'lodash/fp/omit';
import _pick from 'lodash/fp/pick';
import _pickBy from 'lodash/fp/pickBy';
import _omitBy from 'lodash/fp/omitBy';
import _mapKeys from 'lodash/fp/mapKeys';
import _uniq from 'lodash/fp/uniq';
import _intersection from 'lodash/fp/intersection';

import { messageID, combineTruncationStatuses } from '../shared/message-utils';
import { setHighestLocalID } from '../utils/local-ids';
import { threadHasPermission, threadInChatList } from '../shared/thread-utils';
import { setNewSessionActionType } from '../utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  resetPasswordActionTypes,
  registerActionTypes,
} from '../actions/user-actions';
import {
  createEntryActionTypes,
  saveEntryActionTypes,
  deleteEntryActionTypes,
  restoreEntryActionTypes,
} from '../actions/entry-actions';
import {
  changeThreadSettingsActionTypes,
  deleteThreadActionTypes,
  leaveThreadActionTypes,
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  joinThreadActionTypes,
} from '../actions/thread-actions';
import { rehydrateActionType } from '../types/redux-types';
import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMostRecentMessagesActionTypes,
  sendMessageActionTypes,
  saveMessagesActionType,
} from '../actions/message-actions';
import threadWatcher from '../shared/thread-watcher';

// Input must already be ordered!
function threadsToMessageIDsFromMessageInfos(
  orderedMessageInfos: RawMessageInfo[],
): {[threadID: string]: string[]} {
  const threads: {[threadID: string]: string[]} = {};
  for (let messageInfo of orderedMessageInfos) {
    const key = messageID(messageInfo);
    if (!threads[messageInfo.threadID]) {
      threads[messageInfo.threadID] = [ key ];
    } else {
      threads[messageInfo.threadID].push(key);
    }
  }
  return threads;
}

function threadIsWatched(
  threadInfo: ?RawThreadInfo,
  watchedIDs: $ReadOnlyArray<string>,
) {
  return threadInfo &&
    threadHasPermission(threadInfo, threadPermissions.VISIBLE) &&
    (threadInChatList(threadInfo) || watchedIDs.includes(threadInfo.id));
}

function freshMessageStore(
  messageInfos: RawMessageInfo[],
  truncationStatus: {[threadID: string]: MessageTruncationStatus},
  currentAsOf: number,
  threadInfos: {[threadID: string]: RawThreadInfo},
): MessageStore {
  const orderedMessageInfos = _orderBy("time")("desc")(messageInfos);
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
  for (let threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    if (threads[threadID] || !threadIsWatched(threadInfo, watchedIDs)) {
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
  return { messages, threads, currentAsOf };
}

// oldMessageStore is from the old state
// newMessageInfos, truncationStatus come from server
function mergeNewMessages(
  oldMessageStore: MessageStore,
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatus: {[threadID: string]: MessageTruncationStatus},
  threadInfos: {[threadID: string]: RawThreadInfo},
  actionType: *,
): MessageStore {
  const orderedNewMessageInfos = _flow(
    _map((messageInfo: RawMessageInfo) => {
      const inputMessageInfo = messageInfo;
      invariant(inputMessageInfo.id, "new messageInfos should have serverID");
      const currentMessageInfo = oldMessageStore.messages[inputMessageInfo.id];
      if (
        currentMessageInfo &&
        typeof currentMessageInfo.localID === "string"
      ) {
        invariant(
          inputMessageInfo.type === messageTypes.TEXT,
          "only MessageType.TEXT has localID",
        );
        // Try to preserve localIDs. This is because we use them as React
        // keys and changing React keys leads to loss of component state.
        messageInfo = {
          type: messageTypes.TEXT,
          id: inputMessageInfo.id,
          localID: currentMessageInfo.localID,
          threadID: inputMessageInfo.threadID,
          creatorID: inputMessageInfo.creatorID,
          time: inputMessageInfo.time,
          text: inputMessageInfo.text,
        };
      }
      return _isEqual(messageInfo)(currentMessageInfo)
        ? currentMessageInfo
        : messageInfo;
    }),
    _orderBy('time')('desc'),
  )([...newMessageInfos]);

  const threadsToMessageIDs = threadsToMessageIDsFromMessageInfos(
    orderedNewMessageInfos,
  );
  const oldMessageInfosToCombine = [];
  const mustResortThreadMessageIDs = [];
  const lastPruned = Date.now();
  const watchedIDs = threadWatcher.getWatchedIDs();
  const threads = _flow(
    _pickBy(
      (messageIDs: string[], threadID: string) =>
        threadIsWatched(threadInfos[threadID], watchedIDs),
    ),
    _mapValuesWithKeys((messageIDs: string[], threadID: string) => {
      const oldThread = oldMessageStore.threads[threadID];
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
      if (!isContiguous(truncate, oldThread.messageIDs, messageIDs)) {
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
      const oldNotInNew = _difference(oldThread.messageIDs)(messageIDs);
      for (let messageID of oldNotInNew) {
        oldMessageInfosToCombine.push(oldMessageStore.messages[messageID]);
      }
      const startReached = oldThread.startReached ||
        truncate === messageTruncationStatus.EXHAUSTIVE;
      if (_difference(messageIDs)(oldThread.messageIDs).length === 0) {
        // If we have no new messageIDs in the payload, then the only thing that
        // might've changed is startReached.
        if (startReached === oldThread.startReached) {
          return oldThread;
        }
        return {
          messageIDs: oldThread.messageIDs,
          startReached,
          lastNavigatedTo: oldThread.lastNavigatedTo,
          lastPruned: oldThread.lastPruned,
        };
      }
      const mergedMessageIDs = [ ...messageIDs, ...oldNotInNew ];
      mustResortThreadMessageIDs.push(threadID);
      return {
        messageIDs: mergedMessageIDs,
        startReached,
        lastNavigatedTo: oldThread.lastNavigatedTo,
        lastPruned: oldThread.lastPruned,
      };
    }),
    _pickBy(thread => !!thread),
  )(threadsToMessageIDs);

  for (let threadID in oldMessageStore.threads) {
    if (
      threads[threadID] ||
      !threadIsWatched(threadInfos[threadID], watchedIDs)
    ) {
      continue;
    }
    let thread = oldMessageStore.threads[threadID];
    const truncate = truncationStatus[threadID];
    if (truncate === messageTruncationStatus.EXHAUSTIVE) {
      thread = {
        ...thread,
        startReached: true,
      };
    }
    threads[threadID] = thread;
    for (let messageID of thread.messageIDs) {
      const messageInfo = oldMessageStore.messages[messageID];
      if (messageInfo) {
        oldMessageInfosToCombine.push(messageInfo);
      }
    }
  }

  for (let threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    if (threads[threadID] || !threadIsWatched(threadInfo, watchedIDs)) {
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
    _orderBy('time')('desc'),
    _keyBy(messageID),
  )([ ...orderedNewMessageInfos, ...oldMessageInfosToCombine ]);

  for (let threadID of mustResortThreadMessageIDs) {
    threads[threadID].messageIDs = _orderBy([
      (messageID: string) => messages[messageID].time,
    ])('desc')(threads[threadID].messageIDs);
  }

  return { messages, threads, currentAsOf: oldMessageStore.currentAsOf };
}

function isContiguous(
  truncate: MessageTruncationStatus,
  oldMessageIDs: string[],
  newMessageIDs: string[],
): bool {
  if (truncate !== messageTruncationStatus.TRUNCATED) {
    return true;
  }
  if (_intersection(oldMessageIDs)(newMessageIDs).length > 0) {
    return true;
  }
  return false;
}

function filterByNewThreadInfos(
  messageStore: MessageStore,
  threadInfos: {[id: string]: RawThreadInfo},
): MessageStore {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const watchedThreadInfos = _pickBy(
    (threadInfo: RawThreadInfo) => threadIsWatched(threadInfo, watchedIDs),
  )(threadInfos);
  const messageIDsToRemove = [];
  for (let threadID in messageStore.threads) {
    if (watchedThreadInfos[threadID]) {
      continue;
    }
    for (let messageID of messageStore.threads[threadID].messageIDs) {
      messageIDsToRemove.push(messageID);
    }
  }
  return {
    messages: _omit(messageIDsToRemove)(messageStore.messages),
    threads: _pick(Object.keys(watchedThreadInfos))(messageStore.threads),
    currentAsOf: messageStore.currentAsOf,
  };
}

function reduceMessageStore(
  messageStore: MessageStore,
  action: BaseAction,
  newThreadInfos: {[id: string]: RawThreadInfo},
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
    const messagesResult = mergeUpdatesIntoMessagesResult(
      action.payload.messagesResult,
      action.payload.updatesResult.newUpdates,
    );
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
      currentAsOf: messagesResult.currentAsOf,
    };
  } else if (action.type === processUpdatesActionType) {
    if (action.payload.updatesResult.newUpdates.length === 0) {
      return messageStore;
    }

    const mergedMessageInfos = [];
    const mergedTruncationStatuses = {};
    const { newUpdates } = action.payload.updatesResult;
    for (let updateInfo of newUpdates) {
      if (updateInfo.type !== updateTypes.JOIN_THREAD) {
        continue;
      }
      for (let messageInfo of updateInfo.rawMessageInfos) {
        mergedMessageInfos.push(messageInfo);
      }
      mergedTruncationStatuses[updateInfo.threadInfo.id] =
        combineTruncationStatuses(
          updateInfo.truncationStatus,
          mergedTruncationStatuses[updateInfo.threadInfo.id],
        );
    }
    if (Object.keys(mergedTruncationStatuses).length === 0) {
      return messageStore;
    }

    const newMessageStore = mergeNewMessages(
      messageStore,
      mergedMessageInfos,
      mergedTruncationStatuses,
      newThreadInfos,
      action.type,
    );
    return {
      messages: newMessageStore.messages,
      threads: newMessageStore.threads,
      currentAsOf: messageStore.currentAsOf,
    };
  } else if (action.type === fullStateSyncActionType) {
    const { messagesResult } = action.payload;
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
      currentAsOf: messagesResult.currentAsOf,
    };
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
    const newThreadID = action.payload.newThreadInfo.id;
    const truncationStatuses = {};
    for (let messageInfo of action.payload.newMessageInfos) {
      truncationStatuses[messageInfo.threadID] =
        messageInfo.threadID === newThreadID
          ? messageTruncationStatus.EXHAUSTIVE
          : messageTruncationStatus.UNCHANGED;
    }
    return mergeNewMessages(
      messageStore,
      action.payload.newMessageInfos,
      truncationStatuses,
      newThreadInfos,
      action.type,
    );
  } else if (action.type === registerActionTypes.success) {
    const truncationStatuses = {};
    for (let messageInfo of action.payload.rawMessageInfos) {
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
      { [action.payload.threadInfo.id]: messageTruncationStatus.UNCHANGED },
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
    const threadID = action.payload.entryInfo.threadID;
    return mergeNewMessages(
      messageStore,
      action.payload.newMessageInfos,
      { [threadID]: messageTruncationStatus.UNCHANGED },
      newThreadInfos,
      action.type,
    );
  } else if (action.type === joinThreadActionTypes.success) {
    return mergeNewMessages(
      messageStore,
      action.payload.rawMessageInfos,
      action.payload.truncationStatuses,
      newThreadInfos,
      action.type,
    );
  } else if (action.type === sendMessageActionTypes.started) {
    const payload = action.payload;
    invariant(payload.localID, `localID should be set on ${action.type}`);
    return {
      messages: {
        ...messageStore.messages,
        [payload.localID]: payload,
      },
      threads: {
        ...messageStore.threads,
        [payload.threadID]: {
          ...messageStore.threads[payload.threadID],
          messageIDs: [
            payload.localID,
            ...messageStore.threads[payload.threadID].messageIDs,
          ],
        },
      },
      currentAsOf: messageStore.currentAsOf,
    };
  } else if (action.type === sendMessageActionTypes.failed) {
    const payload = action.payload;
    const isNotLocalID = (localID: ?string) => localID !== payload.localID;
    const newMessages = _pickBy(
      (messageInfo: RawMessageInfo) => messageInfo.type !== 0 ||
        isNotLocalID(messageInfo.localID),
    )(messageStore.messages);
    const newMessageIDs =
      messageStore.threads[payload.threadID].messageIDs.filter(isNotLocalID);
    return {
      messages: newMessages,
      threads: {
        ...messageStore.threads,
        [payload.threadID]: {
          ...messageStore.threads[payload.threadID],
          messageIDs: newMessageIDs,
        },
      },
      currentAsOf: messageStore.currentAsOf,
    };
  } else if (action.type === sendMessageActionTypes.success) {
    const payload = action.payload;
    const replaceMessageKey =
      (messageKey: string) => messageKey === payload.localID
        ? payload.serverID
        : messageKey;
    let newMessages;
    if (messageStore.messages[payload.serverID]) {
      // If somehow the serverID got in there already, we'll just update the
      // serverID message and scrub the localID one
      newMessages = _omitBy(
        (messageInfo: RawMessageInfo) => messageInfo.type === 0 &&
          messageInfo.localID === payload.localID,
      )(messageStore.messages);
    } else if (messageStore.messages[payload.localID]) {
      // The normal case, the localID message gets replaces by the serverID one
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
    const newMessageIDs = _uniq(
      messageStore.threads[threadID].messageIDs.map(replaceMessageKey),
    );
    return {
      messages: newMessages,
      threads: {
        ...messageStore.threads,
        [threadID]: {
          ...messageStore.threads[threadID],
          messageIDs: newMessageIDs,
        },
      },
      currentAsOf: messageStore.currentAsOf,
    };
  } else if (action.type === rehydrateActionType) {
    if (!action.payload || !action.payload.messageStore) {
      return messageStore;
    }
    let highestLocalIDFound = -1;
    for (let messageKey in action.payload.messageStore.messages) {
      const messageInfo = action.payload.messageStore.messages[messageKey];
      if (messageInfo.type !== 0) {
        continue;
      }
      const localID = messageInfo.localID;
      if (!localID) {
        continue;
      }
      const matches = localID.match(/^local([0-9]+)$/);
      invariant(
        matches && matches[1],
        `${localID} doesn't look like a localID`,
      );
      const thisLocalID = parseInt(matches[1]);
      if (thisLocalID > highestLocalIDFound) {
        highestLocalIDFound = thisLocalID;
      }
    }
    setHighestLocalID(highestLocalIDFound + 1);
  } else if (action.type === saveMessagesActionType) {
    const truncationStatuses = {};
    for (let messageInfo of action.payload.rawMessageInfos) {
      truncationStatuses[messageInfo.threadID] =
        messageTruncationStatus.UNCHANGED;
    }
    return mergeNewMessages(
      messageStore,
      action.payload.rawMessageInfos,
      truncationStatuses,
      newThreadInfos,
      action.type,
    );
  }
  return messageStore;
}

function mergeUpdatesIntoMessagesResult(
  messagesResult: MessagesResponse,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
): MessagesResponse {
  const messageIDs = new Set(messagesResult.rawMessageInfos.map(
    messageInfo => messageInfo.id,
  ));
  const mergedMessageInfos = [...messagesResult.rawMessageInfos];
  const mergedTruncationStatuses = {...messagesResult.truncationStatuses};
  for (let updateInfo of newUpdates) {
    if (updateInfo.type !== updateTypes.JOIN_THREAD) {
      continue;
    }
    for (let messageInfo of updateInfo.rawMessageInfos) {
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
    currentAsOf: messagesResult.currentAsOf,
  };
}

export {
  freshMessageStore,
  reduceMessageStore,
};
