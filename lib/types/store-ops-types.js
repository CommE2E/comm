// @flow

import type {
  DraftStoreOperation,
  ClientDBDraftStoreOperation,
} from './draft-types.js';
import type {
  ClientDBMessageStoreOperation,
  MessageStoreOperation,
} from './message-types.js';
import type {
  ClientDBThreadStoreOperation,
  ThreadStoreOperation,
} from './thread-types.js';

export type StoreOperations = {
  +draftStoreOperations: $ReadOnlyArray<DraftStoreOperation>,
  +threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
  +messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
};

export type ClientDBStoreOperations = {
  +draftStoreOperations?: $ReadOnlyArray<ClientDBDraftStoreOperation>,
  +threadStoreOperations?: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  +messageStoreOperations?: $ReadOnlyArray<ClientDBMessageStoreOperation>,
};
