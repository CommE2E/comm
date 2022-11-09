// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

import type {
  ClientDBMessageInfo,
  ClientDBMessageStoreOperation,
} from 'lib/types/message-types';
import type {
  ClientDBThreadInfo,
  ClientDBThreadStoreOperation,
} from 'lib/types/thread-types';

type ClientDBDraftInfo = {
  +key: string,
  +text: string,
};

export interface Spec extends TurboModule {
  +getDraft: (key: string) => Promise<string>;
  +updateDraft: (draft: ClientDBDraftInfo) => Promise<boolean>;
  +moveDraft: (oldKey: string, newKey: string) => Promise<boolean>;
  +getAllDrafts: () => Promise<$ReadOnlyArray<ClientDBDraftInfo>>;
  +removeAllDrafts: () => Promise<void>;
  +getAllMessages: () => Promise<$ReadOnlyArray<ClientDBMessageInfo>>;
  +getAllMessagesSync: () => $ReadOnlyArray<ClientDBMessageInfo>;
  +processMessageStoreOperations: (
    operations: $ReadOnlyArray<ClientDBMessageStoreOperation>,
  ) => Promise<void>;
  +processMessageStoreOperationsSync: (
    operations: $ReadOnlyArray<ClientDBMessageStoreOperation>,
  ) => void;
  +getAllThreads: () => Promise<$ReadOnlyArray<ClientDBThreadInfo>>;
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
  +openSocket: (endpoint: string) => Object;
  +getCodeVersion: () => number;
  +setNotifyToken: (token: string) => Promise<void>;
  +clearNotifyToken: () => Promise<void>;
  +setCurrentUserID: (userID: string) => Promise<void>;
  +getCurrentUserID: () => Promise<string>;
  +setDeviceID: (deviceType: string) => Promise<string>;
  +getDeviceID: () => Promise<string>;
  +clearSensitiveData: () => Promise<void>;
  +cancelTasks: () => Promise<void>;
  +runTasks: () => Promise<void>;
  +printMessageAndWaitAsync: (message: string) => Promise<void>;
  +printMessageAndWaitSync: (message: string) => void;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
