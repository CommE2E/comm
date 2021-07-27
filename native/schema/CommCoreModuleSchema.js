// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

export type SQLiteMessageInfo = {
  +id: string,
  +thread: string,
  +user: string,
  +type: string,
  +futureType: string,
  +content: string,
  +time: string,
  +creation: string,
};

export type SQLiteDraftInfo = {
  +key: string,
  +text: string,
};

export type RemoveMessageOperation = {
  +type: 'remove',
  +payload: { +id: string },
};

export type ReplaceMessageOperation = {
  +type: 'replace',
  +payload: SQLiteMessageInfo,
};

export type MessageStoreOperation =
  | RemoveMessageOperation
  | ReplaceMessageOperation;

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
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommTurboModule',
): Spec);
