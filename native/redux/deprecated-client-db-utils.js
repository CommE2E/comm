// @flow

import type { ClientDBThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import type { RawThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type {
  ClientDBThreadInfo,
  LegacyRawThreadInfo,
  MixedRawThreadInfos,
} from 'lib/types/thread-types.js';
import { values } from 'lib/utils/objects.js';
import {
  convertRawThreadInfoToClientDBThreadInfo,
  deprecatedConvertClientDBThreadInfoToRawThreadInfo,
} from 'lib/utils/thread-ops-utils.js';

import type { AppState } from './state-types.js';
import { commCoreModule } from '../native-modules.js';

function deprecatedUpdateClientDBThreadStoreThreadInfos(
  state: AppState,
  migrationFunc: MixedRawThreadInfos => MixedRawThreadInfos,
  handleMigrationFailure?: AppState => AppState,
): AppState {
  // Get threads from SQLite `threads` table.
  const clientDBThreadInfos = commCoreModule.getAllThreadsSync();

  const operations = deprecatedCreateUpdateDBOpsForThreadStoreThreadInfos(
    clientDBThreadInfos,
    migrationFunc,
  );

  // Try processing `ClientDBThreadStoreOperation`s and log out if
  //    `processThreadStoreOperationsSync(...)` throws an exception.
  try {
    commCoreModule.processThreadStoreOperationsSync(operations);
  } catch (exception) {
    console.log(exception);
    if (handleMigrationFailure) {
      return handleMigrationFailure(state);
    }
    return ({ ...state, cookie: null }: any);
  }

  return state;
}

function deprecatedCreateUpdateDBOpsForThreadStoreThreadInfos(
  clientDBThreadInfos: $ReadOnlyArray<ClientDBThreadInfo>,
  migrationFunc: MixedRawThreadInfos => MixedRawThreadInfos,
): $ReadOnlyArray<ClientDBThreadStoreOperation> {
  // Translate `ClientDBThreadInfo`s to `RawThreadInfo`s.
  const rawThreadInfos = clientDBThreadInfos.map(
    deprecatedConvertClientDBThreadInfoToRawThreadInfo,
  );

  // Convert `rawThreadInfo`s to a map of `threadID` => `threadInfo`.
  const threadIDToThreadInfo = rawThreadInfos.reduce(
    (
      acc: { [string]: LegacyRawThreadInfo | RawThreadInfo },
      threadInfo: LegacyRawThreadInfo | RawThreadInfo,
    ) => {
      acc[threadInfo.id] = threadInfo;
      return acc;
    },
    {},
  );

  // Apply `migrationFunc` to `threadInfo`s.
  const updatedThreadIDToThreadInfo = migrationFunc(threadIDToThreadInfo);

  // Convert the updated `threadInfo`s back into an array.
  const updatedRawThreadInfos: $ReadOnlyArray<
    LegacyRawThreadInfo | RawThreadInfo,
  > = values(updatedThreadIDToThreadInfo);

  // Translate `RawThreadInfo`s to `ClientDBThreadInfo`s.
  const convertedClientDBThreadInfos: $ReadOnlyArray<ClientDBThreadInfo> =
    updatedRawThreadInfos.map(convertRawThreadInfoToClientDBThreadInfo);

  // Construct `ClientDBThreadStoreOperation`s to clear SQLite `threads`
  //    table and repopulate with `ClientDBThreadInfo`s.
  return [
    {
      type: 'remove_all',
    },
    ...convertedClientDBThreadInfos.map((thread: ClientDBThreadInfo) => ({
      type: 'replace',
      payload: thread,
      isBackedUp: false,
    })),
  ];
}

export {
  deprecatedCreateUpdateDBOpsForThreadStoreThreadInfos,
  deprecatedUpdateClientDBThreadStoreThreadInfos,
};
