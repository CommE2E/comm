// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport.js';

import type { ClientDBCommunityStoreOperation } from 'lib/ops/community-store-ops.js';
import type { ClientDBKeyserverStoreOperation } from 'lib/ops/keyserver-store-ops';
import type { ClientDBMessageStoreOperation } from 'lib/ops/message-store-ops.js';
import type { ClientDBReportStoreOperation } from 'lib/ops/report-store-ops.js';
import type { ClientDBThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import type { ClientDBUserStoreOperation } from 'lib/ops/user-store-ops';
import type { OLMOneTimeKeys } from 'lib/types/crypto-types';
import type { ClientDBDraftStoreOperation } from 'lib/types/draft-types.js';
import type { ClientDBMessageInfo } from 'lib/types/message-types.js';
import type { ClientDBStore } from 'lib/types/store-ops-types';
import type { ClientDBThreadInfo } from 'lib/types/thread-types.js';

type ClientPublicKeys = {
  +primaryIdentityPublicKeys: {
    +ed25519: string,
    +curve25519: string,
  },
  +notificationIdentityPublicKeys: {
    +ed25519: string,
    +curve25519: string,
  },
  +blobPayload: string,
  +signature: string,
};

type SignedPrekeys = {
  +contentPrekey: string,
  +contentPrekeySignature: string,
  +notifPrekey: string,
  +notifPrekeySignature: string,
};

type CommServicesAuthMetadata = {
  +userID?: ?string,
  +deviceID?: ?string,
  +accessToken?: ?string,
};

type OneTimeKeysResult = {
  contentOneTimeKeys: OLMOneTimeKeys,
  notificationsOneTimeKeys: OLMOneTimeKeys,
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
  +initializeContentOutboundSession: (
    identityKeys: string,
    prekey: string,
    prekeySignature: string,
    oneTimeKey: string,
    deviceID: string,
  ) => Promise<string>;
  +initializeContentInboundSession: (
    identityKeys: string,
    encryptedMessage: string,
    deviceID: string,
  ) => Promise<string>;
  +encrypt: (message: string, deviceID: string) => Promise<string>;
  +decrypt: (message: string, deviceID: string) => Promise<string>;
  +signMessage: (message: string) => Promise<string>;
  +getCodeVersion: () => number;
  +terminate: () => void;
  +setNotifyToken: (token: string) => Promise<void>;
  +clearNotifyToken: () => Promise<void>;
  +setCurrentUserID: (userID: string) => Promise<void>;
  +getCurrentUserID: () => Promise<string>;
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
  +setCommServicesAccessToken: (accessToken: string) => Promise<void>;
  +clearCommServicesAccessToken: () => Promise<void>;
  +startBackupHandler: () => void;
  +stopBackupHandler: () => void;
  +createNewBackup: (backupSecret: string, userData: string) => Promise<void>;
  +restoreBackup: (backupSecret: string) => Promise<string>;
}

export interface CoreModuleSpec extends Spec {
  +computeBackupKey: (
    password: string,
    backupID: string,
  ) => Promise<ArrayBuffer>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
