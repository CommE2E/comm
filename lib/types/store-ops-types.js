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
import type { ClientDBThreadInfo } from './thread-types.js';
import type {
  ReportStoreOperation,
  ClientDBReport,
  ClientDBReportStoreOperation,
} from '../ops/report-store-ops.js';
import type {
  ClientDBThreadStoreOperation,
  ThreadStoreOperation,
} from '../ops/thread-store-ops.js';

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
  +reportStoreOperations?: $ReadOnlyArray<ClientDBReportStoreOperation>,
};

export type ClientDBStore = {
  +messages: $ReadOnlyArray<ClientDBMessageInfo>,
  +drafts: $ReadOnlyArray<ClientDBDraftInfo>,
  +threads: $ReadOnlyArray<ClientDBThreadInfo>,
  +messageStoreThreads: $ReadOnlyArray<ClientDBThreadMessageInfo>,
  +reports: $ReadOnlyArray<ClientDBReport>,
};
