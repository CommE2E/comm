// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

type SQLiteMessageInfo = {
  +id: string,
  +thread: string,
  +user: string,
  +type: string,
  +future_type: string,
  +content: string,
  +time: string,
};

type SQLiteDraftInfo = {
  +key: string,
  +text: string,
};

type RemoveMessageOperation = {
  +type: 'remove',
  +payload: { +id: string },
};

type ReplaceMessageOperation = {
  +type: 'replace',
  +payload: SQLiteMessageInfo,
};

type MessageStoreOperation = RemoveMessageOperation | ReplaceMessageOperation;

export interface Spec extends TurboModule {
  +getDraft: (key: string) => Promise<string>;
  +updateDraft: (draft: SQLiteDraftInfo) => Promise<boolean>;
  +moveDraft: (oldKey: string, newKey: string) => Promise<boolean>;
  +getAllDrafts: () => Promise<$ReadOnlyArray<SQLiteDraftInfo>>;
  +removeAllDrafts: () => Promise<void>;
  +removeAllMessages: () => Promise<void>;
  +getAllMessages: () => Promise<$ReadOnlyArray<SQLiteMessageInfo>>;
  +processMessageStoreOperations: (
    operations: $ReadOnlyArray<MessageStoreOperation>,
  ) => Promise<void>;
  +initializeCryptoAccount: (userId: string) => Promise<string>;
  +getUserPublicKey: (userId: string) => Promise<string>;
  +getUserOneTimeKeys: (userId: string) => Promise<string>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
