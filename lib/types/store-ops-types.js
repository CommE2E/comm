// @flow

import type { DraftStoreOperation } from './draft-types';
import type { MessageStoreOperation } from './message-types';
import type { ThreadStoreOperation } from './thread-types';

export type StoreOperations = {
  +draftStoreOperations: $ReadOnlyArray<DraftStoreOperation>,
  +threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
  +messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
};
