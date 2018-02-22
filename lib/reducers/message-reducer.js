// @flow

import {
  type RawMessageInfo,
  type ThreadMessageInfo,
  type MessageStore,
  type MessageTruncationStatus,
  messageTruncationStatus,
  messageType,
  defaultNumberPerThread,
} from '../types/message-types';
import type { BaseAction } from '../types/redux-types';
import type { RawThreadInfo } from '../types/thread-types';

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

import { messageID } from '../shared/message-utils';
import { setHighestLocalID } from '../utils/local-ids';
import { viewerIsMember } from '../shared/thread-utils';
import { setCookieActionType } from '../utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  resetPasswordActionTypes,
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
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  joinThreadActionTypes,
} from '../actions/thread-actions';
import { pingActionTypes } from '../actions/ping-actions';
import { rehydrateActionType } from '../types/redux-types';
import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMostRecentMessagesActionTypes,
  sendMessageActionTypes,
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
    (viewerIsMember(threadInfo) || watchedIDs.includes(threadInfo.id));
}

function freshMessageStore(
  messageInfos: RawMessageInfo[],
  truncationStatus: {[threadID: string]: MessageTruncationStatus},
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
  return { messages, threads };
}

// oldMessageStore is from the old state
// newMessageInfos, truncationStatus come from server
// replaceUnlessUnchanged refers to how we should treat threads that have a
// MessageTruncationStatus that isn't unchanged. if it's true, we will
// completely replace what's in the store with what came from the server, but if
// it's false we will attempt to merge
function mergeNewMessages(
  oldMessageStore: MessageStore,
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatus: {[threadID: string]: MessageTruncationStatus},
  threadInfos: ?{[threadID: string]: RawThreadInfo},
  replaceUnlessUnchanged: bool,
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
          inputMessageInfo.type === messageType.TEXT,
          "only MessageType.TEXT has localID",
        );
        // Try to preserve localIDs. This is because we use them as React
        // keys and changing React keys leads to loss of component state.
        messageInfo = {
          type: messageType.TEXT,
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
        !threadInfos || threadIsWatched(threadInfos[threadID], watchedIDs),
    ),
    _mapValuesWithKeys((messageIDs: string[], threadID: string) => {
      const oldThread = oldMessageStore.threads[threadID];
      const truncate = truncationStatus[threadID];
      if (!oldThread) {
        return {
          messageIDs,
          startReached: truncate === messageTruncationStatus.EXHAUSTIVE,
          lastNavigatedTo: 0,
          lastPruned,
        };
      }
      const expectedTruncationStatus = oldThread.startReached
        ? messageTruncationStatus.EXHAUSTIVE
        : messageTruncationStatus.TRUNCATED;
      if (
        _isEqual(messageIDs)(oldThread.messageIDs) &&
        (truncate === messageTruncationStatus.UNCHANGED ||
          truncate === expectedTruncationStatus)
      ) {
        return oldThread;
      }
      let mergedMessageIDs = messageIDs;
      if (
        !replaceUnlessUnchanged ||
        truncate === messageTruncationStatus.UNCHANGED
      ) {
        const oldNotInNew = _difference(oldThread.messageIDs)(messageIDs);
        for (let messageID of oldNotInNew) {
          oldMessageInfosToCombine.push(oldMessageStore.messages[messageID]);
        }
        mergedMessageIDs = [ ...messageIDs, ...oldNotInNew ];
        mustResortThreadMessageIDs.push(threadID);
      }
      return {
        messageIDs: mergedMessageIDs,
        startReached: truncate === messageTruncationStatus.EXHAUSTIVE ||
          (truncate === messageTruncationStatus.UNCHANGED &&
            oldThread.startReached),
        lastNavigatedTo: oldThread.lastNavigatedTo,
        lastPruned: oldThread.lastPruned,
      };
    }),
  )(threadsToMessageIDs);

  for (let threadID in oldMessageStore.threads) {
    if (
      threads[threadID] ||
      (threadInfos && !threadIsWatched(threadInfos[threadID], watchedIDs))
    ) {
      continue;
    }
    const thread = oldMessageStore.threads[threadID];
    const truncate = truncationStatus[threadID];
    if (truncate === messageTruncationStatus.EXHAUSTIVE) {
      thread.startReached = true;
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

  return { messages, threads };
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
  };
}

function reduceMessageStore(
  messageStore: MessageStore,
  action: BaseAction,
): MessageStore {
  if (
    action.type === logInActionTypes.success ||
      action.type === resetPasswordActionTypes.success
  ) {
    const messagesResult = action.payload.messagesResult;
    return freshMessageStore(
      messagesResult.messageInfos,
      messagesResult.truncationStatus,
      action.payload.threadInfos,
    );
  } else if (action.type === pingActionTypes.success) {
    const messagesResult = action.payload.messagesResult;
    return mergeNewMessages(
      messageStore,
      messagesResult.messageInfos,
      messagesResult.truncationStatus,
      action.payload.threadInfos,
      true,
    );
  } else if (
    action.type === fetchMessagesBeforeCursorActionTypes.success ||
      action.type === fetchMostRecentMessagesActionTypes.success
  ) {
    return mergeNewMessages(
      messageStore,
      action.payload.rawMessageInfos,
      { [action.payload.threadID]: action.payload.truncationStatus },
      null,
      false,
    );
  } else if (
    action.type === logOutActionTypes.success ||
      action.type === deleteAccountActionTypes.success ||
      action.type === setCookieActionType
  ) {
    return filterByNewThreadInfos(messageStore, action.payload.threadInfos);
  } else if (action.type === deleteThreadActionTypes.success) {
    const threadID = action.payload.threadID;
    const messageIDs = messageStore.threads[threadID].messageIDs;
    return {
      messages: _omit(messageIDs)(messageStore.messages),
      threads: _omit([ threadID ])(messageStore.threads),
    };
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
      null,
      false,
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
      null,
      false,
    );
  } else if (
    action.type === createEntryActionTypes.success ||
      action.type === saveEntryActionTypes.success
  ) {
    return mergeNewMessages(
      messageStore,
      action.payload.newMessageInfos,
      { [action.payload.threadID]: messageTruncationStatus.UNCHANGED },
      null,
      false,
    );
  } else if (action.type === deleteEntryActionTypes.success) {
    const payload = action.payload;
    if (payload) {
      return mergeNewMessages(
        messageStore,
        payload.newMessageInfos,
        { [payload.threadID]: messageTruncationStatus.UNCHANGED },
        null,
        false,
      );
    }
  } else if (action.type === restoreEntryActionTypes.success) {
    const threadID = action.payload.entryInfo.threadID;
    return mergeNewMessages(
      messageStore,
      action.payload.newMessageInfos,
      { [threadID]: messageTruncationStatus.UNCHANGED },
      null,
      false,
    );
  } else if (action.type === joinThreadActionTypes.success) {
    return mergeNewMessages(
      messageStore,
      action.payload.rawMessageInfos,
      action.payload.truncationStatuses,
      action.payload.threadInfos,
      true,
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
  } else if (
    action.type === pingActionTypes.started &&
    action.payload.messageStorePruneRequest
  ) {
    const messageStorePruneRequest = action.payload.messageStorePruneRequest;
    const now = Date.now();
    const messageIDsToPrune = [];
    let newThreads = { ...messageStore.threads };
    for (let threadID of messageStorePruneRequest.threadIDs) {
      const thread = newThreads[threadID];
      if (!thread) {
        continue;
      }
      const removed = thread.messageIDs.splice(defaultNumberPerThread);
      for (let messageID of removed) {
        messageIDsToPrune.push(messageID);
      }
      thread.lastPruned = now;
      if (removed.length > 0) {
        thread.startReached = false;
      }
    }
    return {
      messages: _omit(messageIDsToPrune)(messageStore.messages),
      threads: newThreads,
    };
  }
  return messageStore;
}

export {
  freshMessageStore,
  reduceMessageStore,
};
