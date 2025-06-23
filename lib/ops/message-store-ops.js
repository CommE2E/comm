// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import { getDataIsBackedUpByThread } from '../shared/threads/protocols/thread-protocols.js';
import type {
  ClientDBMessageInfo,
  ClientDBThreadMessageInfo,
  MessageStore,
  MessageStoreThreads,
  RawMessageInfo,
  LocalMessageInfo,
  ClientDBLocalMessageInfo,
} from '../types/message-types.js';
import { type MixedRawThreadInfos } from '../types/thread-types.js';
import {
  translateClientDBMessageInfoToRawMessageInfo,
  translateRawMessageInfoToClientDBMessageInfo,
  translateThreadMessageInfoToClientDBThreadMessageInfo,
} from '../utils/message-ops-utils.js';

// MessageStore messages ops
export type RemoveMessageOperation = {
  +type: 'remove',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveMessagesForThreadsOperation = {
  +type: 'remove_messages_for_threads',
  +payload: { +threadIDs: $ReadOnlyArray<string> },
};

export type ReplaceMessageOperation = {
  +type: 'replace',
  +payload: { +id: string, +messageInfo: RawMessageInfo, +isBackedUp: boolean },
};

export type RekeyMessageOperation = {
  +type: 'rekey',
  +payload: { +from: string, +to: string },
};

export type RemoveAllMessagesOperation = {
  +type: 'remove_all',
};

// MessageStore threads ops
export type ReplaceMessageStoreThreadsOperation = {
  +type: 'replace_threads',
  +payload: { +threads: MessageStoreThreads, +isBackedUp: boolean },
};

export type RemoveMessageStoreThreadsOperation = {
  +type: 'remove_threads',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveMessageStoreAllThreadsOperation = {
  +type: 'remove_all_threads',
};

// MessageStore local ops
export type ReplaceMessageStoreLocalMessageInfoOperation = {
  +type: 'replace_local_message_info',
  +payload: {
    +id: string,
    +localMessageInfo: LocalMessageInfo,
    +isBackedUp: boolean,
  },
};

export type RemoveMessageStoreLocalMessageInfosOperation = {
  +type: 'remove_local_message_infos',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveMessageStoreAllLocalMessageInfosOperation = {
  +type: 'remove_all_local_message_infos',
};

export type ClientDBReplaceMessageOperation = {
  +type: 'replace',
  +payload: ClientDBMessageInfo,
  +isBackedUp: boolean,
};

export type ClientDBReplaceThreadsOperation = {
  +type: 'replace_threads',
  +payload: { +threads: $ReadOnlyArray<ClientDBThreadMessageInfo> },
  +isBackedUp: boolean,
};

export type ClientDBReplaceLocalMessageInfoOperation = {
  +type: 'replace_local_message_info',
  +payload: ClientDBLocalMessageInfo,
  +isBackedUp: boolean,
};

export type MessageStoreOperation =
  | RemoveMessageOperation
  | ReplaceMessageOperation
  | RekeyMessageOperation
  | RemoveMessagesForThreadsOperation
  | RemoveAllMessagesOperation
  | ReplaceMessageStoreThreadsOperation
  | RemoveMessageStoreThreadsOperation
  | RemoveMessageStoreAllThreadsOperation
  | ReplaceMessageStoreLocalMessageInfoOperation
  | RemoveMessageStoreLocalMessageInfosOperation
  | RemoveMessageStoreAllLocalMessageInfosOperation;

export type ClientDBMessageStoreOperation =
  | RemoveMessageOperation
  | ClientDBReplaceMessageOperation
  | RekeyMessageOperation
  | RemoveMessagesForThreadsOperation
  | RemoveAllMessagesOperation
  | ClientDBReplaceThreadsOperation
  | RemoveMessageStoreThreadsOperation
  | RemoveMessageStoreAllThreadsOperation
  | ClientDBReplaceLocalMessageInfoOperation
  | RemoveMessageStoreLocalMessageInfosOperation
  | RemoveMessageStoreAllLocalMessageInfosOperation;

const messageStoreOpsHandlers: BaseStoreOpsHandlers<
  MessageStore,
  MessageStoreOperation,
  ClientDBMessageStoreOperation,
  { +[id: string]: RawMessageInfo },
  ClientDBMessageInfo,
> = {
  processStoreOperations(
    store: MessageStore,
    ops: $ReadOnlyArray<MessageStoreOperation>,
  ): MessageStore {
    if (ops.length === 0) {
      return store;
    }
    let processedMessages = { ...store.messages };
    let processedThreads = { ...store.threads };
    let processedLocal = { ...store.local };

    for (const operation of ops) {
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
      } else if (operation.type === 'replace_local_message_info') {
        processedLocal[operation.payload.id] =
          operation.payload.localMessageInfo;
      } else if (operation.type === 'remove_local_message_infos') {
        for (const id of operation.payload.ids) {
          delete processedLocal[id];
        }
      } else if (operation.type === 'remove_all_local_message_infos') {
        processedLocal = {};
      }
    }
    return {
      ...store,
      threads: processedThreads,
      messages: processedMessages,
      local: processedLocal,
    };
  },

  convertOpsToClientDBOps(
    ops: ?$ReadOnlyArray<MessageStoreOperation>,
  ): $ReadOnlyArray<ClientDBMessageStoreOperation> {
    if (!ops) {
      return [];
    }
    const convertedOperations = ops.map(messageStoreOperation => {
      if (messageStoreOperation.type === 'replace') {
        return {
          type: 'replace',
          payload: translateRawMessageInfoToClientDBMessageInfo(
            messageStoreOperation.payload.messageInfo,
          ),
          isBackedUp: messageStoreOperation.payload.isBackedUp,
        };
      }

      if (messageStoreOperation.type === 'replace_threads') {
        const threadMessageInfo: MessageStoreThreads =
          messageStoreOperation.payload.threads;
        const dbThreadMessageInfos: ClientDBThreadMessageInfo[] = [];
        for (const threadID in threadMessageInfo) {
          dbThreadMessageInfos.push(
            translateThreadMessageInfoToClientDBThreadMessageInfo(
              threadID,
              threadMessageInfo[threadID],
            ),
          );
        }
        if (dbThreadMessageInfos.length === 0) {
          return undefined;
        }
        return {
          type: 'replace_threads',
          payload: {
            threads: dbThreadMessageInfos,
          },
          isBackedUp: messageStoreOperation.payload.isBackedUp,
        };
      } else if (messageStoreOperation.type === 'replace_local_message_info') {
        return {
          type: 'replace_local_message_info',
          payload: {
            id: messageStoreOperation.payload.id,
            localMessageInfo: JSON.stringify(
              messageStoreOperation.payload.localMessageInfo,
            ),
          },
          isBackedUp: messageStoreOperation.payload.isBackedUp,
        };
      }
      return messageStoreOperation;
    });
    return convertedOperations.filter(Boolean);
  },

  translateClientDBData(data: $ReadOnlyArray<ClientDBMessageInfo>): {
    +[id: string]: RawMessageInfo,
  } {
    return Object.fromEntries(
      data.map((dbMessageInfo: ClientDBMessageInfo) => [
        dbMessageInfo.id,
        translateClientDBMessageInfoToRawMessageInfo(dbMessageInfo),
      ]),
    );
  },
};

function createReplaceMessageOperation(
  id: string,
  messageInfo: RawMessageInfo,
  threadInfos: MixedRawThreadInfos,
): ReplaceMessageOperation {
  const threadInfo = threadInfos[messageInfo.threadID];
  return {
    type: 'replace',
    payload: {
      id,
      messageInfo,
      isBackedUp: getDataIsBackedUpByThread(messageInfo.threadID, threadInfo),
    },
  };
}

function createReplaceMessageStoreThreadsOperations(
  threads: MessageStoreThreads,
  threadInfos: MixedRawThreadInfos,
): $ReadOnlyArray<ReplaceMessageStoreThreadsOperation> {
  let backedUpThreads: MessageStoreThreads = {};
  let notBackedUpThreads: MessageStoreThreads = {};
  for (const threadID in threads) {
    const threadInfo = threadInfos[threadID];
    if (getDataIsBackedUpByThread(threadID, threadInfo)) {
      backedUpThreads = {
        ...backedUpThreads,
        [threadID]: threads[threadID],
      };
    } else {
      notBackedUpThreads = {
        ...notBackedUpThreads,
        [threadID]: threads[threadID],
      };
    }
  }

  const ops: Array<ReplaceMessageStoreThreadsOperation> = [];
  if (Object.keys(backedUpThreads).length) {
    ops.push({
      type: 'replace_threads',
      payload: { threads: backedUpThreads, isBackedUp: true },
    });
  }
  if (Object.keys(notBackedUpThreads).length) {
    ops.push({
      type: 'replace_threads',
      payload: { threads: notBackedUpThreads, isBackedUp: false },
    });
  }
  return ops;
}

function createReplaceMessageStoreLocalOperation(
  id: string,
  localMessageInfo: LocalMessageInfo,
): ReplaceMessageStoreLocalMessageInfoOperation {
  // For backup purposes, the only thing that needs to be tracked
  // is whether the DM message failed.
  if (localMessageInfo.sendFailed && localMessageInfo.outboundP2PMessageIDs) {
    return {
      type: 'replace_local_message_info',
      payload: { id, localMessageInfo, isBackedUp: true },
    };
  }
  return {
    type: 'replace_local_message_info',
    payload: {
      id,
      localMessageInfo,
      isBackedUp: false,
    },
  };
}

export {
  messageStoreOpsHandlers,
  createReplaceMessageOperation,
  createReplaceMessageStoreLocalOperation,
  createReplaceMessageStoreThreadsOperations,
};
