// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport.js';

import type { ClientDBMessageStoreOperation } from 'lib/ops/message-store-ops.js';
import type { ClientDBReportStoreOperation } from 'lib/ops/report-store-ops.js';
import type { ClientDBThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import type {
  OneTimeKeysResult,
  SignedPrekeys,
  ClientPublicKeys,
  EncryptedData,
  OutboundSessionCreationResult,
} from 'lib/types/crypto-types.js';
import type { ClientDBMessageInfo } from 'lib/types/message-types.js';
import type { SIWEBackupSecrets } from 'lib/types/siwe-types.js';
import type {
  InboundP2PMessage,
  OutboundP2PMessage,
} from 'lib/types/sqlite-types.js';
import type {
  ClientDBStore,
  ClientDBStoreOperations,
} from 'lib/types/store-ops-types';
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
  +processMessageStoreOperationsSync: (
    operations: $ReadOnlyArray<ClientDBMessageStoreOperation>,
  ) => void;
  +getAllThreadsSync: () => $ReadOnlyArray<ClientDBThreadInfo>;
  +processReportStoreOperationsSync: (
    operations: $ReadOnlyArray<ClientDBReportStoreOperation>,
  ) => void;
  +processThreadStoreOperationsSync: (
    operations: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  ) => void;
  +processDBStoreOperations: (operations: Object) => Promise<void>;
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
    oneTimeKey: ?string,
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
    oneTimeKey: ?string,
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
  +encryptAndPersist: (
    message: string,
    deviceID: string,
    messageID: string,
  ) => Promise<EncryptedData>;
  +decrypt: (encryptedData: Object, deviceID: string) => Promise<string>;
  +decryptAndPersist: (
    encryptedData: Object,
    deviceID: string,
    messageID: string,
  ) => Promise<string>;
  +signMessage: (message: string) => Promise<string>;
  +verifySignature: (
    publicKey: string,
    message: string,
    signature: string,
  ) => Promise<void>;
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
  +createNewSIWEBackup: (
    backupSecret: string,
    siweBackupMsg: string,
  ) => Promise<void>;
  +restoreBackup: (backupSecret: string, maxVersion: string) => Promise<string>;
  +restoreSIWEBackup: (
    backupSecret: string,
    backupID: string,
    maxVersion: string,
  ) => Promise<string>;
  +restoreBackupData: (
    backupID: string,
    backupDataKey: string,
    backupLogDataKey: string,
    maxVersion: string,
  ) => Promise<void>;
  +retrieveBackupKeys: (backupSecret: string) => Promise<string>;
  +retrieveLatestSIWEBackupData: () => Promise<string>;
  +setSIWEBackupSecrets: (siweBackupSecrets: Object) => Promise<void>;
  +getSIWEBackupSecrets: () => Promise<?Object>;
  +getAllInboundP2PMessages: () => Promise<Array<InboundP2PMessage>>;
  +removeInboundP2PMessages: (ids: $ReadOnlyArray<string>) => Promise<void>;
  +getOutboundP2PMessagesByID: (
    ids: $ReadOnlyArray<string>,
  ) => Promise<Array<OutboundP2PMessage>>;
  +getAllOutboundP2PMessages: () => Promise<Array<OutboundP2PMessage>>;
  +markOutboundP2PMessageAsSent: (
    messageID: string,
    deviceID: string,
  ) => Promise<void>;
  +removeOutboundP2PMessagesOlderThan: (
    messageID: string,
    deviceID: string,
  ) => Promise<void>;
  +getSyncedDatabaseVersion: () => Promise<string>;
  +markPrekeysAsPublished: () => Promise<void>;
  +getRelatedMessages: (
    messageID: string,
  ) => Promise<Array<ClientDBMessageInfo>>;
  +searchMessages: (
    query: string,
    threadID: string,
    timestampCursor: ?string,
    messageIDCursor: ?string,
  ) => Promise<Array<ClientDBMessageInfo>>;
}

export interface CoreModuleSpec extends Spec {
  +computeBackupKey: (
    password: string,
    backupID: string,
  ) => Promise<ArrayBuffer>;
  +decrypt: (encryptedData: EncryptedData, deviceID: string) => Promise<string>;
  +decryptAndPersist: (
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
  +setSIWEBackupSecrets: (
    siweBackupSecrets: SIWEBackupSecrets,
  ) => Promise<void>;
  +getSIWEBackupSecrets: () => Promise<?SIWEBackupSecrets>;
  +processDBStoreOperations: (
    operations: ClientDBStoreOperations,
  ) => Promise<void>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
