// @flow

import type {
  MessageInfo,
  ThreadMessageInfo,
  MessageStore,
  MessageTruncationStatus,
} from '../types/message-types';
import type { BaseAction } from '../types/redux-types';
import type { ThreadInfo } from '../types/thread-types';

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

import { messageID } from '../shared/message-utils';
import { messageTruncationStatus } from '../types/message-types';
import { setHighestLocalID } from '../utils/local-ids';

// keep value in sync with DEFAULT_NUMBER_PER_THREAD in message_lib.php
const numberPerThread = 20; 

// Input must already be ordered!
function threadsToMessageIDsFromMessageInfos(
  orderedMessageInfos: MessageInfo[],
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

function freshMessageStore(
  messageInfos: MessageInfo[],
  truncationStatus: {[threadID: string]: MessageTruncationStatus},
  threadInfos: {[threadID: string]: ThreadInfo},
  currentAsOf: number,
): MessageStore {
  const orderedMessageInfos = _orderBy("time")("desc")(messageInfos);
  const messages = _keyBy(messageID)(orderedMessageInfos);
  const threadsToMessageIDs = threadsToMessageIDsFromMessageInfos(
    orderedMessageInfos,
  );
  const threads = _mapValuesWithKeys(
    (messageIDs: string[], threadID: string) => ({
      messageIDs,
      startReached:
        truncationStatus[threadID] === messageTruncationStatus.EXHAUSTIVE,
    }),
  )(threadsToMessageIDs);
  for (let threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    if (threadInfo.authorized && !threads[threadID]) {
      threads[threadID] = {
        messageIDs: [],
        // We can conclude that startReached, since no messages were returned
        startReached: true,
      };
    }
  }
  return { messages, threads, currentAsOf };
}

// oldMessageStore is from the old state
// newMessageInfos, truncationStatus, serverTime come from server
// replaceUnlessUnchanged refers to how we should treat threads that have a
// MessageTruncationStatus that isn't unchanged. if it's true, we will
// completely replace what's in the store with what came from the server, but if
// it's false we will attempt to merge
function mergeNewMessages(
  oldMessageStore: MessageStore,
  newMessageInfos: MessageInfo[],
  truncationStatus: {[threadID: string]: MessageTruncationStatus},
  threadInfos: {[threadID: string]: ThreadInfo},
  serverTime: number,
  replaceUnlessUnchanged: bool,
): MessageStore {
  const orderedNewMessageInfos = _flow(
    _map((messageInfo: MessageInfo) => {
      invariant(messageInfo.id, "new messageInfos should have serverID");
      const currentMessageInfo = oldMessageStore.messages[messageInfo.id];
      if (currentMessageInfo && currentMessageInfo.localID) {
        // Try to preserve localIDs. This is because we use them as React
        // keys and changing React keys leads to loss of component state.
        messageInfo = {
          ...messageInfo,
          localID: currentMessageInfo.localID,
        };
      }
      return _isEqual(messageInfo)(currentMessageInfo)
        ? currentMessageInfo
        : messageInfo;
    }),
    _orderBy('time')('desc'),
  )(newMessageInfos);

  const threadsToMessageIDs = threadsToMessageIDsFromMessageInfos(
    orderedNewMessageInfos,
  );
  const oldMessageInfosToCombine = [];
  const mustResortThreadMessageIDs = [];
  const newThreads = _mapValuesWithKeys(
    (messageIDs: string[], threadID: string) => {
      const oldThread = oldMessageStore.threads[threadID];
      const truncate = truncationStatus[threadID];
      if (!oldThread) {
        return {
          messageIDs,
          startReached: truncate === messageTruncationStatus.EXHAUSTIVE,
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
      };
    },
  )(threadsToMessageIDs);

  let threads = { ...oldMessageStore.threads, ...newThreads };
  for (let threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    const thread = threads[threadID];
    if (threadInfo.authorized && !thread) {
      threads[threadID] = {
        messageIDs: [],
        // We can conclude that startReached, since no messages were returned
        startReached: true,
      };
    } else if (threadInfo.authorized) {
      for (let messageID of thread.messageIDs) {
        const messageInfo = oldMessageStore.messages[messageID];
        if (messageInfo) {
          oldMessageInfosToCombine.push(messageInfo);
        }
      }
    } else {
      threads = _omit([ threadID ])(threads);
    }
  }

  const messages = _flow(
    _orderBy('time')('desc'),
    _keyBy(messageID),
  )([ ...orderedNewMessageInfos, ...oldMessageInfosToCombine ]);

  for (let threadID of mustResortThreadMessageIDs) {
    threads[threadID].messageIDs = _orderBy(
      (messageID: string) => messages[messageID].time,
    )('desc')(threads[threadID].messageIDs);
  }

  return { messages, threads, currentAsOf: serverTime };
}

function filterByNewThreadInfos(
  messageStore: MessageStore,
  threadInfos: {[id: string]: ThreadInfo},
): MessageStore {
  const authorizedThreadInfos = _pickBy('authorized')(threadInfos);
  const messageIDsToRemove = [];
  for (let threadID in messageStore.threads) {
    if (authorizedThreadInfos[threadID]) {
      continue;
    }
    for (let messageID of messageStore.threads[threadID].messageIDs) {
      messageIDsToRemove.push(messageID);
    }
  }
  return {
    messages: _omit(messageIDsToRemove)(messageStore.messages),
    threads: _pick(Object.keys(authorizedThreadInfos))(messageStore.threads),
    currentAsOf: messageStore.currentAsOf,
  };
}

function reduceMessageStore(
  messageStore: MessageStore,
  action: BaseAction,
): MessageStore {
  if (
    action.type === "LOG_IN_SUCCESS" ||
      action.type === "RESET_PASSWORD_SUCCESS"
  ) {
    const messagesResult = action.payload.messagesResult;
    return freshMessageStore(
      messagesResult.messageInfos,
      messagesResult.truncationStatus,
      action.payload.threadInfos,
      messagesResult.serverTime,
    );
  } else if (action.type === "PING_SUCCESS") {
    const messagesResult = action.payload.messagesResult;
    return mergeNewMessages(
      messageStore,
      messagesResult.messageInfos,
      messagesResult.truncationStatus,
      action.payload.threadInfos,
      messagesResult.serverTime,
      true,
    );
  } else if (action.type === "FETCH_MESSAGES_SUCCESS") {
    return mergeNewMessages(
      messageStore,
      action.payload.messageInfos,
      { [action.payload.threadID]: action.payload.truncationStatus },
      {},
      messageStore.currentAsOf,
      false,
    );
  } else if (
    action.type === "LOG_OUT_SUCCESS" ||
      action.type === "DELETE_ACCOUNT_SUCCESS"
  ) {
    return filterByNewThreadInfos(messageStore, action.payload);
  } else if (action.type === "SET_COOKIE" && action.payload.threadInfos) {
    return filterByNewThreadInfos(messageStore, action.payload.threadInfos);
  } else if (action.type === "DELETE_THREAD_SUCCESS") {
    const threadID = action.payload;
    const messageIDs = messageStore.threads[threadID].messageIDs;
    return {
      messages: _omit(messageIDs)(messageStore.messages),
      threads: _omit([ threadID ])(messageStore.threads),
      currentAsOf: messageStore.currentAsOf,
    };
  } else if (action.type === "NEW_THREAD_SUCCESS") {
    const threadID = action.payload.id;
    return {
      messages: messageStore.messages,
      threads: {
        ...messageStore.threads,
        [threadID]: {
          messageIDs: [],
          startReached: true,
        },
      },
      currentAsOf: messageStore.currentAsOf,
    };
  } else if (action.type === "AUTH_THREAD_SUCCESS") {
    const threadID = action.payload.threadInfo.id;
    const thread = messageStore.threads[threadID];
    if (action.payload.threadInfo.authorized && !thread) {
      return mergeNewMessages(
        messageStore,
        action.payload.messageInfos,
        { [threadID]: action.payload.truncationStatus },
        { [threadID]: action.payload.threadInfo },
        messageStore.currentAsOf,
        true,
      );
    } else if (!action.payload.threadInfo.authorized && thread) {
      return {
        messages: _omit(thread.messageIDs)(messageStore.messages),
        threads: _omit([ threadID ])(messageStore.threads),
        currentAsOf: messageStore.currentAsOf,
      };
    }
  } else if (action.type === "SEND_MESSAGE_STARTED") {
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
  } else if (action.type === "SEND_MESSAGE_SUCCESS") {
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
        (messageInfo: MessageInfo) => messageInfo.localID === payload.localID,
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
    const newMessageIDs =
      messageStore.threads[threadID].messageIDs.map(replaceMessageKey);
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
  } else if (action.type === "persist/REHYDRATE") {
    if (!action.payload.messageStore) {
      return messageStore;
    }
    let highestLocalIDFound = -1;
    for (let messageKey in action.payload.messageStore.messages) {
      const localID = action.payload.messageStore.messages[messageKey].localID;
      if (localID) {
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
    }
    setHighestLocalID(highestLocalIDFound + 1);
  }
  return messageStore;
}

export {
  numberPerThread,
  freshMessageStore,
  reduceMessageStore,
};
