// @flow

import type {
  ClientDBThreadInfo,
  ClientDBThreadStoreOperation,
  RawThreadInfo,
} from 'lib/types/thread-types.js';
import {
  convertClientDBThreadInfoToRawThreadInfo,
  convertRawThreadInfoToClientDBThreadInfo,
} from 'lib/utils/thread-ops-utils.js';

import type { AppState } from './state-types.js';
import { commCoreModule } from '../native-modules.js';

type ThreadStoreThreadInfos = { +[id: string]: RawThreadInfo };

function updateClientDBThreadStoreThreadInfos(
  state: AppState,
  migrationFunc: ThreadStoreThreadInfos => ThreadStoreThreadInfos,
): AppState {
  // 1. Get threads from SQLite `threads` table.
  const clientDBThreadInfos = commCoreModule.getAllThreadsSync();

  // 2. Translate `ClientDBThreadInfo`s to `RawThreadInfo`s.
  const rawThreadInfos = clientDBThreadInfos.map(
    convertClientDBThreadInfoToRawThreadInfo,
  );

  // 3. Convert `rawThreadInfo`s to a map of `threadID` => `threadInfo`.
  const threadIDToThreadInfo = rawThreadInfos.reduce((acc, threadInfo) => {
    acc[threadInfo.id] = threadInfo;
    return acc;
  }, {});

  // 4. Apply `migrationFunc` to `threadInfo`s.
  const updatedThreadIDToThreadInfo: ThreadStoreThreadInfos =
    migrationFunc(threadIDToThreadInfo);

  // 5. Convert the updated `threadInfo`s back into an array.
  const updatedRawThreadInfos: $ReadOnlyArray<RawThreadInfo> = Object.keys(
    updatedThreadIDToThreadInfo,
  ).map(id => updatedThreadIDToThreadInfo[id]);

  // 6. Translate `RawThreadInfo`s to `ClientDBThreadInfo`s.
  const convertedClientDBThreadInfos: $ReadOnlyArray<ClientDBThreadInfo> =
    updatedRawThreadInfos.map(convertRawThreadInfoToClientDBThreadInfo);

  // 7. Construct `ClientDBThreadStoreOperation`s to clear SQLite `threads`
  //    table and repopulate with `ClientDBThreadInfo`s.
  const operations: $ReadOnlyArray<ClientDBThreadStoreOperation> = [
    {
      type: 'remove_all',
    },
    ...convertedClientDBThreadInfos.map((thread: ClientDBThreadInfo) => ({
      type: 'replace',
      payload: thread,
    })),
  ];

  // 8. Try processing `ClientDBThreadStoreOperation`s and log out if
  //    `processThreadStoreOperationsSync(...)` throws an exception.
  try {
    commCoreModule.processThreadStoreOperationsSync(operations);
  } catch (exception) {
    console.log(exception);
    return { ...state, cookie: null };
  }

  return state;
}

export { updateClientDBThreadStoreThreadInfos };
