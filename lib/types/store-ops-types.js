// @flow
import type { MessageStoreOperation } from './message-types';
import type { ThreadStoreOperation } from './thread-types';

export type StoreOperations = {
  +threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
  +messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
};
