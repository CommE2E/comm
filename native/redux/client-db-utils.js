// @flow

import type {
  ClientDBMessageStoreOperation,
  RawMessageInfo,
} from 'lib/types/message-types.js';
import type {
  ClientDBThreadInfo,
  ClientDBThreadStoreOperation,
  RawThreadInfo,
  ThreadStoreThreadInfos,
} from 'lib/types/thread-types.js';
import {
  translateClientDBMessageInfoToRawMessageInfo,
  translateRawMessageInfoToClientDBMessageInfo,
} from 'lib/utils/message-ops-utils.js';
import {
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
  const updatedRawThreadInfos: $ReadOnlyArray<RawThreadInfo> = values(
    updatedThreadIDToThreadInfo,
  );

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

function updateClientDBMessageStoreMessages(
  state: AppState,
  migrationFunc: (
    $ReadOnlyArray<RawMessageInfo>,
  ) => $ReadOnlyArray<RawMessageInfo>,
): AppState {
  const clientDBMessageInfos = commCoreModule.getAllMessagesSync();

  const rawMessageInfos = clientDBMessageInfos.map(
    translateClientDBMessageInfoToRawMessageInfo,
  );

  const convertedRawMessageInfos = migrationFunc(rawMessageInfos);

  const replaceMessagesOperations: $ReadOnlyArray<ClientDBMessageStoreOperation> =
    convertedRawMessageInfos.map(messageInfo => ({
      type: 'replace',
      payload: translateRawMessageInfoToClientDBMessageInfo(messageInfo),
    }));

  const operations: $ReadOnlyArray<ClientDBMessageStoreOperation> = [
    {
      type: 'remove_all',
    },
    ...replaceMessagesOperations,
  ];

  try {
    commCoreModule.processMessageStoreOperationsSync(operations);
  } catch (exception) {
    console.log(exception);
    return { ...state, cookie: null };
  }

  return state;
}

async function updateClientDBMessageStoreThreads(
  state: AppState,
  migrationFunc: TranslatedThreadMessageInfos => TranslatedThreadMessageInfos,
): Promise<AppState> {
  const { messageStoreThreads } = await commCoreModule.getClientDBStore();

  const translatedMessageStoreThreads =
    translateClientDBThreadMessageInfos(messageStoreThreads);

  const convertedTranslatedMessageStoreThreads = migrationFunc(
    translatedMessageStoreThreads,
  );

  const operations: $ReadOnlyArray<ClientDBMessageStoreOperation> = [
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

  try {
    commCoreModule.processMessageStoreOperationsSync(operations);
  } catch (exception) {
    console.log(exception);
    return { ...state, cookie: null };
  }

  return state;
}

export {
  updateClientDBThreadStoreThreadInfos,
  updateClientDBMessageStoreMessages,
  updateClientDBMessageStoreThreads,
};
