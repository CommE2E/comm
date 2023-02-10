// @flow

import type { DraftStoreOperation } from './draft-types.js';
import type { MessageStoreOperation } from './message-types.js';
import type { ThreadStoreOperation } from './thread-types.js';

export type StoreOperations = {
  +draftStoreOperations: $ReadOnlyArray<DraftStoreOperation>,
  +threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
  +messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
};
