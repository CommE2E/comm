// @flow

import type { ClientDBMessageStoreOperation } from 'lib/ops/message-store-ops.js';
import type { ClientDBThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import type {
  RawMessageInfo,
  ClientDBMessageInfo,
  ClientDBThreadMessageInfo,
} from 'lib/types/message-types.js';
import type {
  ClientDBThreadInfo,
  RawThreadInfo,
  ThreadStoreThreadInfos,
} from 'lib/types/thread-types.js';
import {
  translateClientDBMessageInfoToRawMessageInfo,
  translateRawMessageInfoToClientDBMessageInfo,
  translateClientDBThreadMessageInfos,
  translateThreadMessageInfoToClientDBThreadMessageInfo,
  type TranslatedThreadMessageInfos,
} from 'lib/utils/message-ops-utils.js';
import { values, entries } from 'lib/utils/objects.js';
import {
  convertClientDBThreadInfoToRawThreadInfo,
  convertRawThreadInfoToClientDBThreadInfo,
} from 'lib/utils/thread-ops-utils.js';

import type { AppState } from './state-types.js';
import { commCoreModule } from '../native-modules.js';

function updateClientDBThreadStoreThreadInfos(
  state: AppState,
  migrationFunc: ThreadStoreThreadInfos => ThreadStoreThreadInfos,
): AppState {
  // Get threads from SQLite `threads` table.
  const clientDBThreadInfos = commCoreModule.getAllThreadsSync();

  const operations = createUpdateDBOpsForThreadStoreThreadInfos(
    clientDBThreadInfos,
    migrationFunc,
  );

  // Try processing `ClientDBThreadStoreOperation`s and log out if
  //    `processThreadStoreOperationsSync(...)` throws an exception.
  try {
    commCoreModule.processThreadStoreOperationsSync(operations);
  } catch (exception) {
    console.log(exception);
    const keyserverInfos = { ...state.keyserverStore.keyserverInfos };
    for (const key in keyserverInfos) {
      keyserverInfos[key] = { ...keyserverInfos[key], cookie: null };
    }
    const keyserverStore = { ...state.keyserverStore, keyserverInfos };
    return {
      ...state,
      keyserverStore,
    };
  }

  return state;
}

function createUpdateDBOpsForThreadStoreThreadInfos(
  clientDBThreadInfos: $ReadOnlyArray<ClientDBThreadInfo>,
  migrationFunc: ThreadStoreThreadInfos => ThreadStoreThreadInfos,
): $ReadOnlyArray<ClientDBThreadStoreOperation> {
  // Translate `ClientDBThreadInfo`s to `RawThreadInfo`s.
  const rawThreadInfos = clientDBThreadInfos.map(
    convertClientDBThreadInfoToRawThreadInfo,
  );

  // Convert `rawThreadInfo`s to a map of `threadID` => `threadInfo`.
  const threadIDToThreadInfo = rawThreadInfos.reduce((acc, threadInfo) => {
    acc[threadInfo.id] = threadInfo;
    return acc;
  }, {});

  // Apply `migrationFunc` to `threadInfo`s.
  const updatedThreadIDToThreadInfo: ThreadStoreThreadInfos =
    migrationFunc(threadIDToThreadInfo);

  // Convert the updated `threadInfo`s back into an array.
  const updatedRawThreadInfos: $ReadOnlyArray<RawThreadInfo> = values(
    updatedThreadIDToThreadInfo,
  );

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
    })),
  ];
}

function createUpdateDBOpsForMessageStoreMessages(
  clientDBMessageInfos: $ReadOnlyArray<ClientDBMessageInfo>,
  migrationFunc: (
    $ReadOnlyArray<RawMessageInfo>,
  ) => $ReadOnlyArray<RawMessageInfo>,
): $ReadOnlyArray<ClientDBMessageStoreOperation> {
  const rawMessageInfos = clientDBMessageInfos.map(
    translateClientDBMessageInfoToRawMessageInfo,
  );

  const convertedRawMessageInfos = migrationFunc(rawMessageInfos);

  const replaceMessagesOperations: $ReadOnlyArray<ClientDBMessageStoreOperation> =
    convertedRawMessageInfos.map(messageInfo => ({
      type: 'replace',
      payload: translateRawMessageInfoToClientDBMessageInfo(messageInfo),
    }));

  return [
    {
      type: 'remove_all',
    },
    ...replaceMessagesOperations,
  ];
}

function createUpdateDBOpsForMessageStoreThreads(
  messageStoreThreads: $ReadOnlyArray<ClientDBThreadMessageInfo>,
  migrationFunc: TranslatedThreadMessageInfos => TranslatedThreadMessageInfos,
): $ReadOnlyArray<ClientDBMessageStoreOperation> {
  const translatedMessageStoreThreads =
    translateClientDBThreadMessageInfos(messageStoreThreads);

  const convertedTranslatedMessageStoreThreads = migrationFunc(
    translatedMessageStoreThreads,
  );

  return [
    {
      type: 'remove_all_threads',
    },
    {
      type: 'replace_threads',
      payload: {
        threads: entries(convertedTranslatedMessageStoreThreads).map(
          ([id, thread]) =>
            translateThreadMessageInfoToClientDBThreadMessageInfo(id, thread),
        ),
      },
    },
  ];
}

export {
  updateClientDBThreadStoreThreadInfos,
  createUpdateDBOpsForThreadStoreThreadInfos,
  createUpdateDBOpsForMessageStoreMessages,
  createUpdateDBOpsForMessageStoreThreads,
};
