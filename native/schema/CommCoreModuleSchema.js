// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport.js';

import type { ClientDBMessageStoreOperation } from 'lib/ops/message-store-ops';
import type { ClientDBReportStoreOperation } from 'lib/ops/report-store-ops.js';
import type { ClientDBThreadStoreOperation } from 'lib/ops/thread-store-ops';
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

export interface Spec extends TurboModule {
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
  +initializeCryptoAccount: () => Promise<string>;
  +getUserPublicKey: () => Promise<ClientPublicKeys>;
  +getPrimaryOneTimeKeys: (
    oneTimeKeysAmount: number,
  ) => Promise<OLMOneTimeKeys>;
  +initializeNotificationsSession: (
    identityKeys: string,
    prekey: string,
    prekeySignature: string,
    oneTimeKeys: string,
  ) => Promise<string>;
  +isNotificationsSessionInitialized: () => Promise<boolean>;
  +getCodeVersion: () => number;
  +terminate: () => void;
  +setNotifyToken: (token: string) => Promise<void>;
  +clearNotifyToken: () => Promise<void>;
  +setCurrentUserID: (userID: string) => Promise<void>;
  +getCurrentUserID: () => Promise<string>;
  +setDeviceID: (deviceType: string) => Promise<string>;
  +getDeviceID: () => Promise<string>;
  +clearSensitiveData: () => Promise<void>;
  +checkIfDatabaseNeedsDeletion: () => boolean;
  +reportDBOperationsFailure: () => void;
  +generateNonce: () => Promise<string>;
  +registerUser: (
    username: string,
    password: string,
    keyPayload: string,
    keyPayloadSignature: string,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
  ) => Promise<string>;
  +loginPasswordUser: (
    username: string,
    password: string,
    keyPayload: string,
    keyPayloadSignature: string,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
  ) => Promise<string>;
  +loginWalletUser: (
    siweMessage: string,
    siweSignature: string,
    keyPayload: string,
    keyPayloadSignature: string,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
    socialProof: string,
  ) => Promise<string>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
