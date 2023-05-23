// @flow

import type {
  DraftStoreOperation,
  ClientDBDraftStoreOperation,
  ClientDBDraftInfo,
} from './draft-types.js';
import type {
  ClientDBMessageInfo,
  ClientDBMessageStoreOperation,
  MessageStoreOperation,
  ClientDBThreadMessageInfo,
} from './message-types.js';
import type {
  ClientDBThreadInfo,
  ClientDBThreadStoreOperation,
  ThreadStoreOperation,
} from './thread-types.js';
import type { ReportStoreOperation } from '../ops/report-store-ops.js';

export type StoreOperations = {
  +draftStoreOperations: $ReadOnlyArray<DraftStoreOperation>,
  +threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
  +messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
  +reportStoreOperations: $ReadOnlyArray<ReportStoreOperation>,
};

export type ClientDBStoreOperations = {
  +draftStoreOperations?: $ReadOnlyArray<ClientDBDraftStoreOperation>,
  +threadStoreOperations?: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  +messageStoreOperations?: $ReadOnlyArray<ClientDBMessageStoreOperation>,
};

export type ClientDBStore = {
  +messages: $ReadOnlyArray<ClientDBMessageInfo>,
  +drafts: $ReadOnlyArray<ClientDBDraftInfo>,
  +threads: $ReadOnlyArray<ClientDBThreadInfo>,
  +messageStoreThreads: $ReadOnlyArray<ClientDBThreadMessageInfo>,
};
