// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

import type {
  SQLiteMessageInfo,
  SQLiteMessageStoreOperation,
} from 'lib/types/message-types';

type SQLiteDraftInfo = {
  +key: string,
  +text: string,
};

export interface Spec extends TurboModule {
  +getDraft: (key: string) => Promise<string>;
  +updateDraft: (draft: SQLiteDraftInfo) => Promise<boolean>;
  +moveDraft: (oldKey: string, newKey: string) => Promise<boolean>;
  +getAllDrafts: () => Promise<$ReadOnlyArray<SQLiteDraftInfo>>;
  +removeAllDrafts: () => Promise<void>;
  +removeAllMessages: () => Promise<void>;
  +getAllMessages: () => Promise<$ReadOnlyArray<SQLiteMessageInfo>>;
  +processMessageStoreOperations: (
    operations: $ReadOnlyArray<SQLiteMessageStoreOperation>,
  ) => Promise<void>;
  +initializeCryptoAccount: (userId: string) => Promise<string>;
  +getUserPublicKey: () => Promise<string>;
  +getUserOneTimeKeys: () => Promise<string>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
