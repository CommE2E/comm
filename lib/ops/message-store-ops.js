// @flow

import type {
  ClientDBMessageInfo,
  ClientDBThreadMessageInfo,
  MessageStoreThreads,
  RawMessageInfo,
} from '../types/message-types.js';

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
