// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import type {
  ClientDBMessageInfo,
  ClientDBThreadMessageInfo,
  MessageStore,
  MessageStoreThreads,
  RawMessageInfo,
} from '../types/message-types.js';
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
  +payload: { +id: string, +messageInfo: RawMessageInfo },
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
  +payload: { +threads: MessageStoreThreads },
};

export type RemoveMessageStoreThreadsOperation = {
  +type: 'remove_threads',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveMessageStoreAllThreadsOperation = {
  +type: 'remove_all_threads',
};

export type ClientDBReplaceMessageOperation = {
  +type: 'replace',
  +payload: ClientDBMessageInfo,
};

export type ClientDBReplaceThreadsOperation = {
  +type: 'replace_threads',
  +payload: { +threads: $ReadOnlyArray<ClientDBThreadMessageInfo> },
};

export type MessageStoreOperation =
  | RemoveMessageOperation
  | ReplaceMessageOperation
  | RekeyMessageOperation
  | RemoveMessagesForThreadsOperation
  | RemoveAllMessagesOperation
  | ReplaceMessageStoreThreadsOperation
  | RemoveMessageStoreThreadsOperation
  | RemoveMessageStoreAllThreadsOperation;

export type ClientDBMessageStoreOperation =
  | RemoveMessageOperation
  | ClientDBReplaceMessageOperation
  | RekeyMessageOperation
  | RemoveMessagesForThreadsOperation
  | RemoveAllMessagesOperation
  | ClientDBReplaceThreadsOperation
  | RemoveMessageStoreThreadsOperation
  | RemoveMessageStoreAllThreadsOperation;

export const messageStoreOpsHandlers: BaseStoreOpsHandlers<
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
      }
    }
    return {
      ...store,
      threads: processedThreads,
      messages: processedMessages,
    };
  },

  convertOpsToClientDBOps(
    ops: $ReadOnlyArray<MessageStoreOperation>,
  ): $ReadOnlyArray<ClientDBMessageStoreOperation> {
    const convertedOperations = ops.map(messageStoreOperation => {
      if (messageStoreOperation.type === 'replace') {
        return {
          type: 'replace',
          payload: translateRawMessageInfoToClientDBMessageInfo(
            messageStoreOperation.payload.messageInfo,
          ),
        };
      }

      if (messageStoreOperation.type !== 'replace_threads') {
        return messageStoreOperation;
      }

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
      };
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
