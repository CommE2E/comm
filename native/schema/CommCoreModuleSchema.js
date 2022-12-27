// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

import type {
  ClientDBDraftInfo,
  ClientDBDraftStoreOperation,
} from 'lib/types/draft-types';
import type {
  ClientDBMessageInfo,
  ClientDBMessageStoreOperation,
} from 'lib/types/message-types';
import type {
  ClientDBThreadInfo,
  ClientDBThreadStoreOperation,
} from 'lib/types/thread-types';

type ClientDBStore = {
  +messages: $ReadOnlyArray<ClientDBMessageInfo>,
  +drafts: $ReadOnlyArray<ClientDBDraftInfo>,
  +threads: $ReadOnlyArray<ClientDBThreadInfo>,
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
  +initializeCryptoAccount: (userId: string) => Promise<string>;
  +getUserPublicKey: () => Promise<string>;
  +getUserOneTimeKeys: () => Promise<string>;
  +getCodeVersion: () => number;
  +setNotifyToken: (token: string) => Promise<void>;
  +clearNotifyToken: () => Promise<void>;
  +setCurrentUserID: (userID: string) => Promise<void>;
  +getCurrentUserID: () => Promise<string>;
  +setDeviceID: (deviceType: string) => Promise<string>;
  +getDeviceID: () => Promise<string>;
  +clearSensitiveData: () => Promise<void>;
  +get42: () => Promise<number>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
