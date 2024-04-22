// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport.js';

import type { ClientDBAuxUserStoreOperation } from 'lib/ops/aux-user-store-ops.js';
import type { ClientDBCommunityStoreOperation } from 'lib/ops/community-store-ops.js';
import type { ClientDBIntegrityStoreOperation } from 'lib/ops/integrity-store-ops.js';
import type { ClientDBKeyserverStoreOperation } from 'lib/ops/keyserver-store-ops';
import type { ClientDBMessageStoreOperation } from 'lib/ops/message-store-ops.js';
import type { ClientDBReportStoreOperation } from 'lib/ops/report-store-ops.js';
import type { ClientDBSyncedMetadataStoreOperation } from 'lib/ops/synced-metadata-store-ops.js';
import type { ClientDBThreadActivityStoreOperation } from 'lib/ops/thread-activity-store-ops.js';
import type { ClientDBThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import type { ClientDBUserStoreOperation } from 'lib/ops/user-store-ops';
import type {
  OneTimeKeysResult,
  SignedPrekeys,
  ClientPublicKeys,
  EncryptedData,
  OutboundSessionCreationResult,
} from 'lib/types/crypto-types.js';
import type { ClientDBDraftStoreOperation } from 'lib/types/draft-types.js';
import type { ClientDBMessageInfo } from 'lib/types/message-types.js';
import type { ClientDBStore } from 'lib/types/store-ops-types';
import type { ClientDBThreadInfo } from 'lib/types/thread-types.js';

type CommServicesAuthMetadata = {
  +userID?: ?string,
  +deviceID?: ?string,
  +accessToken?: ?string,
};

interface Spec extends TurboModule {
  +getDraft: (key: string) => Promise<string>;
  +updateDraft: (key: string, text: string) => Promise<boolean>;
  +moveDraft: (oldKey: string, newKey: string) => Promise<boolean>;
  +getClientDBStore: () => Promise<ClientDBStore>;
  +removeAllDrafts: () => Promise<void>;
  +getAllMessagesSync: () => $ReadOnlyArray<ClientDBMessageInfo>;
  +processDraftStoreOperations: (
    operations: $ReadOnlyArray<ClientDBDraftStoreOperation>,
  ) => Promise<void>;
  +processMessageStoreOperations: (
    operations: $ReadOnlyArray<ClientDBMessageStoreOperation>,
  ) => Promise<void>;
  +processMessageStoreOperationsSync: (
    operations: $ReadOnlyArray<ClientDBMessageStoreOperation>,
  ) => void;
  +getAllThreadsSync: () => $ReadOnlyArray<ClientDBThreadInfo>;
  +processThreadStoreOperations: (
    operations: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  ) => Promise<void>;
  +processReportStoreOperations: (
    operations: $ReadOnlyArray<ClientDBReportStoreOperation>,
  ) => Promise<void>;
  +processReportStoreOperationsSync: (
    operations: $ReadOnlyArray<ClientDBReportStoreOperation>,
  ) => void;
  +processThreadStoreOperationsSync: (
    operations: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  ) => void;
  +processUserStoreOperations: (
    operations: $ReadOnlyArray<ClientDBUserStoreOperation>,
  ) => Promise<void>;
  +processKeyserverStoreOperations: (
    operations: $ReadOnlyArray<ClientDBKeyserverStoreOperation>,
  ) => Promise<void>;
  +processCommunityStoreOperations: (
    operations: $ReadOnlyArray<ClientDBCommunityStoreOperation>,
  ) => Promise<void>;
  +processIntegrityStoreOperations: (
    operations: $ReadOnlyArray<ClientDBIntegrityStoreOperation>,
  ) => Promise<void>;
  +processSyncedMetadataStoreOperations: (
    operations: $ReadOnlyArray<ClientDBSyncedMetadataStoreOperation>,
  ) => Promise<void>;
  +processAuxUserStoreOperations: (
    operations: $ReadOnlyArray<ClientDBAuxUserStoreOperation>,
  ) => Promise<void>;
  +processThreadActivityStoreOperations: (
    operations: $ReadOnlyArray<ClientDBThreadActivityStoreOperation>,
  ) => Promise<void>;
  +initializeCryptoAccount: () => Promise<string>;
  +getUserPublicKey: () => Promise<ClientPublicKeys>;
  +getOneTimeKeys: (oneTimeKeysAmount: number) => Promise<OneTimeKeysResult>;
  +validateAndGetPrekeys: () => Promise<SignedPrekeys>;
  +validateAndUploadPrekeys: (
    authUserID: string,
    authDeviceID: string,
    authAccessToken: string,
  ) => Promise<void>;
  +initializeNotificationsSession: (
    identityKeys: string,
    prekey: string,
    prekeySignature: string,
    oneTimeKey: string,
    keyserverID: string,
  ) => Promise<string>;
  +isNotificationsSessionInitialized: () => Promise<boolean>;
  +updateKeyserverDataInNotifStorage: (
    keyserversData: $ReadOnlyArray<{ +id: string, +unreadCount: number }>,
  ) => Promise<void>;
  +removeKeyserverDataFromNotifStorage: (
    keyserverIDsToDelete: $ReadOnlyArray<string>,
  ) => Promise<void>;
  +getKeyserverDataFromNotifStorage: (
    keyserverIDs: $ReadOnlyArray<string>,
  ) => Promise<$ReadOnlyArray<{ +id: string, +unreadCount: number }>>;
  +initializeContentOutboundSession: (
    identityKeys: string,
    prekey: string,
    prekeySignature: string,
    oneTimeKey: string,
    deviceID: string,
  ) => Promise<OutboundSessionCreationResult>;
  +initializeContentInboundSession: (
    identityKeys: string,
    encryptedContent: Object,
    deviceID: string,
    sessionVersion: number,
    overwrite: boolean,
  ) => Promise<string>;
  +encrypt: (message: string, deviceID: string) => Promise<EncryptedData>;
  +decrypt: (encryptedData: Object, deviceID: string) => Promise<string>;
  +decryptSequential: (
    encryptedData: Object,
    deviceID: string,
    messageID: string,
  ) => Promise<string>;
  +signMessage: (message: string) => Promise<string>;
  +getCodeVersion: () => number;
  +terminate: () => void;
  +setNotifyToken: (token: string) => Promise<void>;
  +clearNotifyToken: () => Promise<void>;
  +stampSQLiteDBUserID: (userID: string) => Promise<void>;
  +getSQLiteStampedUserID: () => Promise<string>;
  +clearSensitiveData: () => Promise<void>;
  +checkIfDatabaseNeedsDeletion: () => boolean;
  +reportDBOperationsFailure: () => void;
  +computeBackupKey: (password: string, backupID: string) => Promise<Object>;
  +generateRandomString: (size: number) => Promise<string>;
  +setCommServicesAuthMetadata: (
    userID: string,
    deviceID: string,
    accessToken: string,
  ) => Promise<void>;
  +getCommServicesAuthMetadata: () => Promise<CommServicesAuthMetadata>;
  +clearCommServicesAuthMetadata: () => Promise<void>;
  +setCommServicesAccessToken: (accessToken: string) => Promise<void>;
  +clearCommServicesAccessToken: () => Promise<void>;
  +startBackupHandler: () => void;
  +stopBackupHandler: () => void;
  +createNewBackup: (backupSecret: string) => Promise<void>;
  +restoreBackup: (backupSecret: string) => Promise<string>;
  +restoreBackupData: (
    backupID: string,
    backupDataKey: string,
    backupLogDataKey: string,
  ) => Promise<void>;
  +retrieveBackupKeys: (backupSecret: string) => Promise<string>;
}

export interface CoreModuleSpec extends Spec {
  +computeBackupKey: (
    password: string,
    backupID: string,
  ) => Promise<ArrayBuffer>;
  +decrypt: (encryptedData: EncryptedData, deviceID: string) => Promise<string>;
  +decryptSequential: (
    encryptedData: EncryptedData,
    deviceID: string,
    messageID: string,
  ) => Promise<string>;
  +initializeContentInboundSession: (
    identityKeys: string,
    encryptedContent: EncryptedData,
    deviceID: string,
    sessionVersion: number,
    overwrite: boolean,
  ) => Promise<string>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
