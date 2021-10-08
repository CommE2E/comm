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
  +removeAllMessages: () => Promise<void>;
  +getAllMessages: () => Promise<$ReadOnlyArray<ClientDBMessageInfo>>;
  +processMessageStoreOperations: (
    operations: $ReadOnlyArray<ClientDBMessageStoreOperation>,
  ) => Promise<void>;
  +getAllThreads: () => Promise<$ReadOnlyArray<ClientDBThreadInfo>>;
  +processThreadStoreOperations: (
    operations: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  ) => Promise<void>;
  +initializeCryptoAccount: (userId: string) => Promise<string>;
  +getUserPublicKey: () => Promise<string>;
  +getUserOneTimeKeys: () => Promise<string>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
