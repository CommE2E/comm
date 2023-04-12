// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport.js';

import type { OLMOneTimeKeys, OLMPrekey } from 'lib/types/crypto-types';
import type { ClientDBDraftStoreOperation } from 'lib/types/draft-types.js';
import type {
  ClientDBMessageInfo,
  ClientDBMessageStoreOperation,
} from 'lib/types/message-types.js';
import type { ClientDBStore } from 'lib/types/store-ops-types';
import type {
  ClientDBThreadInfo,
  ClientDBThreadStoreOperation,
} from 'lib/types/thread-types.js';

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
  +processThreadStoreOperationsSync: (
    operations: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  ) => void;
  +initializeCryptoAccount: () => Promise<string>;
  +getUserPublicKey: () => Promise<ClientPublicKeys>;
  +getUserOneTimeKeys: (oneTimeKeysAmount: number) => Promise<OLMOneTimeKeys>;
  +getNotificationsOneTimeKeys: (
    oneTimeKeysAmount: number,
  ) => Promise<OLMOneTimeKeys>;
  +getNotificationsPrekey: () => Promise<OLMPrekey>;
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
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
