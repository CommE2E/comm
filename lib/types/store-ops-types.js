// @flow

import type { CommunityInfos } from './community-types.js';
import type {
  DraftStoreOperation,
  ClientDBDraftStoreOperation,
  ClientDBDraftInfo,
} from './draft-types.js';
import type { ThreadHashes } from './integrity-types.js';
import type { KeyserverInfos } from './keyserver-types.js';
import type {
  ClientDBMessageInfo,
  ClientDBThreadMessageInfo,
} from './message-types.js';
import type { ClientReportCreationRequest } from './report-types.js';
import type { ClientDBThreadInfo, ThreadStore } from './thread-types.js';
import type { UserInfos } from './user-types.js';
import type {
  ClientDBAuxUserInfo,
  ClientDBAuxUserStoreOperation,
  AuxUserStoreOperation,
} from '../ops/aux-user-store-ops.js';
import type {
  ClientDBCommunityInfo,
  ClientDBCommunityStoreOperation,
  CommunityStoreOperation,
} from '../ops/community-store-ops.js';
import type {
  ClientDBIntegrityThreadHash,
  ClientDBIntegrityStoreOperation,
  IntegrityStoreOperation,
} from '../ops/integrity-store-ops.js';
import type {
  ClientDBKeyserverInfo,
  ClientDBKeyserverStoreOperation,
  KeyserverStoreOperation,
} from '../ops/keyserver-store-ops.js';
import type {
  ClientDBMessageStoreOperation,
  MessageStoreOperation,
} from '../ops/message-store-ops.js';
import type {
  ReportStoreOperation,
  ClientDBReport,
  ClientDBReportStoreOperation,
} from '../ops/report-store-ops.js';
import type {
  ClientDBThreadStoreOperation,
  ThreadStoreOperation,
} from '../ops/thread-store-ops.js';
import type {
  UserStoreOperation,
  ClientDBUserInfo,
} from '../ops/user-store-ops.js';

export type StoreOperations = {
  +draftStoreOperations: $ReadOnlyArray<DraftStoreOperation>,
  +threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
  +messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
  +reportStoreOperations: $ReadOnlyArray<ReportStoreOperation>,
  +userStoreOperations: $ReadOnlyArray<UserStoreOperation>,
  +keyserverStoreOperations: $ReadOnlyArray<KeyserverStoreOperation>,
  +communityStoreOperations: $ReadOnlyArray<CommunityStoreOperation>,
  +integrityStoreOperations: $ReadOnlyArray<IntegrityStoreOperation>,
  +auxUserStoreOperations: $ReadOnlyArray<AuxUserStoreOperation>,
};

export type ClientDBStoreOperations = {
  +draftStoreOperations?: $ReadOnlyArray<ClientDBDraftStoreOperation>,
  +threadStoreOperations?: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  +messageStoreOperations?: $ReadOnlyArray<ClientDBMessageStoreOperation>,
  +reportStoreOperations?: $ReadOnlyArray<ClientDBReportStoreOperation>,
  +keyserverStoreOperations?: $ReadOnlyArray<ClientDBKeyserverStoreOperation>,
  +communityStoreOperations?: $ReadOnlyArray<ClientDBCommunityStoreOperation>,
  +integrityStoreOperations?: $ReadOnlyArray<ClientDBIntegrityStoreOperation>,
  +auxUserStoreOperations?: $ReadOnlyArray<ClientDBAuxUserStoreOperation>,
};

export type ClientDBStore = {
  +messages: $ReadOnlyArray<ClientDBMessageInfo>,
  +drafts: $ReadOnlyArray<ClientDBDraftInfo>,
  +threads: $ReadOnlyArray<ClientDBThreadInfo>,
  +messageStoreThreads: $ReadOnlyArray<ClientDBThreadMessageInfo>,
  +reports: $ReadOnlyArray<ClientDBReport>,
  +users: $ReadOnlyArray<ClientDBUserInfo>,
  +keyservers: $ReadOnlyArray<ClientDBKeyserverInfo>,
  +communities: $ReadOnlyArray<ClientDBCommunityInfo>,
  +integrityThreadHashes: $ReadOnlyArray<ClientDBIntegrityThreadHash>,
  +auxUserInfos: $ReadOnlyArray<ClientDBAuxUserInfo>,
};

export type ClientStore = {
  +currentUserID: ?string,
  +drafts: $ReadOnlyArray<ClientDBDraftInfo>,
  +messages: ?$ReadOnlyArray<ClientDBMessageInfo>,
  +threadStore: ?ThreadStore,
  +messageStoreThreads: ?$ReadOnlyArray<ClientDBThreadMessageInfo>,
  +reports: ?$ReadOnlyArray<ClientReportCreationRequest>,
  +users: ?UserInfos,
  +keyserverInfos: ?KeyserverInfos,
  +communityInfos: ?CommunityInfos,
  +threadHashes: ?ThreadHashes,
};
