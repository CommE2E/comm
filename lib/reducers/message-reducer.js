// @flow

import {
  type RawMessageInfo,
  type ThreadMessageInfo,
  type LocalMessageInfo,
  type MessageStore,
  type MessageTruncationStatus,
  type MessagesResponse,
  type RawMediaMessageInfo,
  type RawImagesMessageInfo,
  messageTruncationStatus,
  messageTypes,
  defaultNumberPerThread,
} from '../types/message-types';
import { type BaseAction, rehydrateActionType } from '../types/redux-types';
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
import threadWatcher from '../shared/thread-watcher';
import { updateMultimediaMessageMediaActionType } from '../actions/upload-actions';
import { unshimMessageInfos } from '../shared/unshim-utils';

// Input must already be ordered!
function threadsToMessageIDsFromMessageInfos(
  orderedMessageInfos: RawMessageInfo[],
): { [threadID: string]: string[] } {
  const threads: { [threadID: string]: string[] } = {};
  for (let messageInfo of orderedMessageInfos) {
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
  threadInfo: ?RawThreadInfo,
  watchedIDs: $ReadOnlyArray<string>,
) {
  return (
    threadInfo &&
    threadHasPermission(threadInfo, threadPermissions.VISIBLE) &&
    (threadInChatList(threadInfo) || watchedIDs.includes(threadInfo.id))
  );
}

function freshMessageStore(
  messageInfos: RawMessageInfo[],
  truncationStatus: { [threadID: string]: MessageTruncationStatus },
  currentAsOf: number,
  threadInfos: { [threadID: string]: RawThreadInfo },
): MessageStore {
  const unshimmed = unshimMessageInfos(messageInfos);
  const orderedMessageInfos = _orderBy('time')('desc')(unshimmed);
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
  return { messages, threads, local: {}, currentAsOf };
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
  const unshimmed = unshimMessageInfos(newMessageInfos);
  const localIDsToServerIDs: Map<string, string> = new Map();
  const orderedNewMessageInfos = _flow(
    _map((messageInfo: RawMessageInfo) => {
      const { id: inputID } = messageInfo;
      invariant(inputID, 'new messageInfos should have serverID');
      const currentMessageInfo = oldMessageStore.messages[inputID];
      if (
        messageInfo.type === messageTypes.TEXT ||
        messageInfo.type === messageTypes.IMAGES ||
        messageInfo.type === messageTypes.MULTIMEDIA
      ) {
        const { localID: inputLocalID } = messageInfo;
        const currentLocalMessageInfo = inputLocalID
          ? oldMessageStore.messages[inputLocalID]
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
      }
      return _isEqual(messageInfo)(currentMessageInfo)
        ? currentMessageInfo
        : messageInfo;
    }),
    _orderBy('time')('desc'),
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
      let oldMessageIDsUnchanged = true;
      const oldMessageIDs = oldThread.messageIDs.map(oldID => {
        const newID = localIDsToServerIDs.get(oldID);
        if (newID !== null && newID !== undefined) {
          oldMessageIDsUnchanged = false;
          return newID;
        }
        return oldID;
      });
      if (!isContiguous(truncate, oldMessageIDs, messageIDs)) {
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
      for (let messageID of oldNotInNew) {
        const oldMessageInfo = oldMessageStore.messages[messageID];
        invariant(
          oldMessageInfo,
          `could not find ${messageID} in messageStore`,
        );
        oldMessageInfosToCombine.push(oldMessageInfo);
        const localInfo = oldMessageStore.local[messageID];
        if (localInfo) {
          local[messageID] = localInfo;
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
      const localInfo = oldMessageStore.local[messageID];
      if (localInfo) {
        local[messageID] = localInfo;
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
  )([...orderedNewMessageInfos, ...oldMessageInfosToCombine]);

  for (let threadID of mustResortThreadMessageIDs) {
    threads[threadID].messageIDs = _orderBy([
      (messageID: string) => messages[messageID].time,
    ])('desc')(threads[threadID].messageIDs);
  }

  const currentAsOf = Math.max(
    orderedNewMessageInfos.length > 0 ? orderedNewMessageInfos[0].time : 0,
    oldMessageStore.currentAsOf,
  );

  return { messages, threads, local, currentAsOf };
}

function isContiguous(
  truncate: MessageTruncationStatus,
  oldMessageIDs: string[],
  newMessageIDs: string[],
): boolean {
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
  threadInfos: { [id: string]: RawThreadInfo },
): MessageStore {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const watchedThreadInfos = _pickBy((threadInfo: RawThreadInfo) =>
    threadIsWatched(threadInfo, watchedIDs),
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
    local: _omit(messageIDsToRemove)(messageStore.local),
    currentAsOf: messageStore.currentAsOf,
  };
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
      local: newMessageStore.local,
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
      mergedTruncationStatuses[
        updateInfo.threadInfo.id
      ] = combineTruncationStatuses(
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
      local: newMessageStore.local,
      currentAsOf: messageStore.currentAsOf,
    };
  } else if (
    action.type === fullStateSyncActionType ||
    action.type === processMessagesActionType
  ) {
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
      local: newMessageStore.local,
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
  } else if (
    action.type === sendTextMessageActionTypes.started ||
    action.type === sendMultimediaMessageActionTypes.started
  ) {
    const { payload } = action;
    const { localID, threadID } = payload;
    invariant(localID, `localID should be set on ${action.type}`);

    if (messageStore.messages[localID]) {
      const messages = { ...messageStore.messages, [localID]: payload };
      const local = _pickBy(
        (localInfo: LocalMessageInfo, key: string) => key !== localID,
      )(messageStore.local);
      const threads = {
        ...messageStore.threads,
        [threadID]: {
          ...messageStore.threads[threadID],
          messageIDs: _orderBy([
            (messageID: string) => messages[messageID].time,
          ])('desc')(messageStore.threads[threadID].messageIDs),
        },
      };
      return { ...messageStore, messages, threads, local };
    }

    const { messageIDs } = messageStore.threads[threadID];
    for (let existingMessageID of messageIDs) {
      const existingMessageInfo = messageStore.messages[existingMessageID];
      if (existingMessageInfo && existingMessageInfo.localID === localID) {
        return messageStore;
      }
    }

    return {
      messages: {
        ...messageStore.messages,
        [localID]: payload,
      },
      threads: {
        ...messageStore.threads,
        [threadID]: {
          ...messageStore.threads[threadID],
          messageIDs: [localID, ...messageStore.threads[threadID].messageIDs],
        },
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
      _orderBy([(messageID: string) => newMessages[messageID].time])('desc'),
    )(messageStore.threads[threadID].messageIDs.map(replaceMessageKey));
    const currentAsOf = Math.max(payload.time, messageStore.currentAsOf);
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
    for (let messageInfo of action.payload.rawMessageInfos) {
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
    let newThreads = { ...messageStore.threads };
    for (let threadID of action.payload.threadIDs) {
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
      local: _omit(messageIDsToPrune)(messageStore.local),
      currentAsOf: messageStore.currentAsOf,
    };
  } else if (action.type === updateMultimediaMessageMediaActionType) {
    const { messageID, currentMediaID, mediaUpdate } = action.payload;
    const message = messageStore.messages[messageID];
    invariant(message, `message with ID ${messageID} could not be found`);
    invariant(
      message.type === messageTypes.IMAGES ||
        message.type === messageTypes.MULTIMEDIA,
      `message with ID ${messageID} is not multimedia`,
    );

    let replaced = false;
    const media = [];
    for (let singleMedia of message.media) {
      if (singleMedia.id !== currentMediaID) {
        media.push(singleMedia);
      } else {
        replaced = true;
        media.push({
          ...singleMedia,
          ...mediaUpdate,
        });
      }
    }
    invariant(
      replaced,
      `message ${messageID} did not contain media with ID ${currentMediaID}`,
    );

    return {
      ...messageStore,
      messages: {
        ...messageStore.messages,
        [messageID]: {
          ...message,
          media,
        },
      },
    };
  } else if (action.type === createLocalMessageActionType) {
    const messageInfo = action.payload;
    return {
      ...messageStore,
      messages: {
        ...messageStore.messages,
        [messageInfo.localID]: messageInfo,
      },
      threads: {
        ...messageStore.threads,
        [messageInfo.threadID]: {
          ...messageStore.threads[messageInfo.threadID],
          messageIDs: [
            messageInfo.localID,
            ...messageStore.threads[messageInfo.threadID].messageIDs,
          ],
        },
      },
    };
  } else if (action.type === rehydrateActionType) {
    // When starting the app on native, we filter out any local-only multimedia
    // messages because the relevant context is no longer available
    const { messages, threads, local } = messageStore;

    const newMessages = {};
    let newThreads = threads,
      newLocal = local;
    for (let messageID in messages) {
      const message = messages[messageID];
      if (
        (message.type !== messageTypes.IMAGES &&
          message.type !== messageTypes.MULTIMEDIA) ||
        message.id
      ) {
        newMessages[messageID] = message;
        continue;
      }
      const { threadID } = message;
      newThreads = {
        ...newThreads,
        [threadID]: {
          ...newThreads[threadID],
          messageIDs: newThreads[threadID].messageIDs.filter(
            curMessageID => curMessageID !== messageID,
          ),
        },
      };
      newLocal = _pickBy(
        (localInfo: LocalMessageInfo, key: string) => key !== messageID,
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

function mergeUpdatesIntoMessagesResult(
  messagesResult: MessagesResponse,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
): MessagesResponse {
  const messageIDs = new Set(
    messagesResult.rawMessageInfos.map(messageInfo => messageInfo.id),
  );
  const mergedMessageInfos = [...messagesResult.rawMessageInfos];
  const mergedTruncationStatuses = { ...messagesResult.truncationStatuses };
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
    currentAsOf: messagesResult.currentAsOf,
  };
}

export { freshMessageStore, reduceMessageStore };
