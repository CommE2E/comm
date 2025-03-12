// @flow

import type { AuxUserInfos } from './aux-user-types.js';
import type { CommunityInfos } from './community-types.js';
import type {
  DraftStoreOperation,
  ClientDBDraftStoreOperation,
  ClientDBDraftInfo,
} from './draft-types.js';
import type { RawEntryInfos } from './entry-types.js';
import type { ThreadHashes } from './integrity-types.js';
import type { KeyserverInfos } from './keyserver-types.js';
import type {
  MessageStoreLocalMessageInfos,
  ClientDBMessageInfo,
  ClientDBThreadMessageInfo,
  ClientDBLocalMessageInfo,
} from './message-types.js';
import type { ClientReportCreationRequest } from './report-types.js';
import type { OutboundP2PMessage } from './sqlite-types.js';
import type { SyncedMetadata } from './synced-metadata-types.js';
import type { ThreadActivityStore } from './thread-activity-types.js';
import type { ClientDBThreadInfo, ThreadStore } from './thread-types.js';
import type { UserInfos } from './user-types.js';
import type {
  ClientDBMessageSearchStoreOperation,
  MessageSearchStoreOperation,
} from '../message-search-types.js';
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
  ClientDBDMOperation,
  ClientDBDMOperationStoreOperation,
  DMOperationStoreOperation,
} from '../ops/dm-operations-store-ops.js';
import type {
  ClientDBEntryInfo,
  EntryStoreOperation,
  ClientDBEntryStoreOperation,
} from '../ops/entries-store-ops.js';
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
  ClientDBSyncedMetadataEntry,
  ClientDBSyncedMetadataStoreOperation,
} from '../ops/synced-metadata-store-ops.js';
import type {
  ThreadActivityStoreOperation,
  ClientDBThreadActivityEntry,
  ClientDBThreadActivityStoreOperation,
} from '../ops/thread-activity-store-ops.js';
import type {
  ClientDBThreadStoreOperation,
  ThreadStoreOperation,
} from '../ops/thread-store-ops.js';
import type {
  ClientDBUserStoreOperation,
  UserStoreOperation,
  ClientDBUserInfo,
} from '../ops/user-store-ops.js';

export type StoreOperations = {
  +draftStoreOperations?: $ReadOnlyArray<DraftStoreOperation>,
  +threadStoreOperations?: $ReadOnlyArray<ThreadStoreOperation>,
  +messageStoreOperations?: $ReadOnlyArray<MessageStoreOperation>,
  +reportStoreOperations?: $ReadOnlyArray<ReportStoreOperation>,
  +userStoreOperations?: $ReadOnlyArray<UserStoreOperation>,
  +keyserverStoreOperations?: $ReadOnlyArray<KeyserverStoreOperation>,
  +communityStoreOperations?: $ReadOnlyArray<CommunityStoreOperation>,
  +integrityStoreOperations?: $ReadOnlyArray<IntegrityStoreOperation>,
  +syncedMetadataStoreOperations?: $ReadOnlyArray<ClientDBSyncedMetadataStoreOperation>,
  +auxUserStoreOperations?: $ReadOnlyArray<AuxUserStoreOperation>,
  +threadActivityStoreOperations?: $ReadOnlyArray<ThreadActivityStoreOperation>,
  +outboundP2PMessages?: $ReadOnlyArray<OutboundP2PMessage>,
  +entryStoreOperations?: $ReadOnlyArray<EntryStoreOperation>,
  +messageSearchStoreOperations?: $ReadOnlyArray<MessageSearchStoreOperation>,
  +dmOperationStoreOperations?: $ReadOnlyArray<DMOperationStoreOperation>,
};

export type ClientDBStoreOperations = {
  +draftStoreOperations?: $ReadOnlyArray<ClientDBDraftStoreOperation>,
  +threadStoreOperations?: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  +messageStoreOperations?: $ReadOnlyArray<ClientDBMessageStoreOperation>,
  +reportStoreOperations?: $ReadOnlyArray<ClientDBReportStoreOperation>,
  +userStoreOperations?: $ReadOnlyArray<ClientDBUserStoreOperation>,
  +keyserverStoreOperations?: $ReadOnlyArray<ClientDBKeyserverStoreOperation>,
  +communityStoreOperations?: $ReadOnlyArray<ClientDBCommunityStoreOperation>,
  +integrityStoreOperations?: $ReadOnlyArray<ClientDBIntegrityStoreOperation>,
  +syncedMetadataStoreOperations?: $ReadOnlyArray<ClientDBSyncedMetadataStoreOperation>,
  +auxUserStoreOperations?: $ReadOnlyArray<ClientDBAuxUserStoreOperation>,
  +threadActivityStoreOperations?: $ReadOnlyArray<ClientDBThreadActivityStoreOperation>,
  +outboundP2PMessages?: $ReadOnlyArray<OutboundP2PMessage>,
  +entryStoreOperations?: $ReadOnlyArray<ClientDBEntryStoreOperation>,
  +messageSearchStoreOperations?: $ReadOnlyArray<ClientDBMessageSearchStoreOperation>,
  +dmOperationStoreOperations?: $ReadOnlyArray<ClientDBDMOperationStoreOperation>,
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
  +syncedMetadata: $ReadOnlyArray<ClientDBSyncedMetadataEntry>,
  +auxUserInfos: $ReadOnlyArray<ClientDBAuxUserInfo>,
  +threadActivityEntries: $ReadOnlyArray<ClientDBThreadActivityEntry>,
  +entries: $ReadOnlyArray<ClientDBEntryInfo>,
  +messageStoreLocalMessageInfos: $ReadOnlyArray<ClientDBLocalMessageInfo>,
  +dmOperations: $ReadOnlyArray<ClientDBDMOperation>,
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
  +syncedMetadata: ?SyncedMetadata,
  +auxUserInfos: ?AuxUserInfos,
  +threadActivityStore: ?ThreadActivityStore,
  +entries: ?RawEntryInfos,
  +messageStoreLocalMessageInfos: ?MessageStoreLocalMessageInfos,
};
