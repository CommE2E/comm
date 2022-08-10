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
  ) => boolean;
  +getAllThreads: () => Promise<$ReadOnlyArray<ClientDBThreadInfo>>;
  +getAllThreadsSync: () => $ReadOnlyArray<ClientDBThreadInfo>;
  +processThreadStoreOperations: (
    operations: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  ) => Promise<void>;
  +processThreadStoreOperationsSync: (
    operations: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  ) => boolean;
  +initializeCryptoAccount: (userId: string) => Promise<string>;
  +getUserPublicKey: () => Promise<string>;
  +getUserOneTimeKeys: () => Promise<string>;
  +openSocket: (endpoint: string) => Object;
  +getCodeVersion: () => number;
  +setNotifyToken: (token: string) => Promise<void>;
  +clearNotifyToken: () => Promise<void>;
  +setCurrentUserID: (userID: string) => void;
  +getCurrentUserID: () => string;
  +clearSensitiveData: () => void;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
