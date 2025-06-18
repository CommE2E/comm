// @flow

import type { ClientDBMessageStoreOperation } from 'lib/ops/message-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import { createUpdateDBOpsForThreadStoreThreadInfos } from 'lib/shared/redux/client-db-utils.js';
import type {
  RawMessageInfo,
  ClientDBMessageInfo,
  ClientDBThreadMessageInfo,
} from 'lib/types/message-types.js';
import type { RawThreadInfos } from 'lib/types/thread-types.js';
import {
  translateClientDBMessageInfoToRawMessageInfo,
  translateRawMessageInfoToClientDBMessageInfo,
  translateClientDBThreadMessageInfos,
  translateThreadMessageInfoToClientDBThreadMessageInfo,
  type TranslatedThreadMessageInfos,
} from 'lib/utils/message-ops-utils.js';
import { entries } from 'lib/utils/objects.js';

import type { AppState } from './state-types.js';
import { commCoreModule } from '../native-modules.js';

function updateClientDBThreadStoreThreadInfos(
  state: AppState,
  migrationFunc: RawThreadInfos => RawThreadInfos,
  handleMigrationFailure?: AppState => AppState,
): AppState {
  const clientDBThreadInfos = commCoreModule.getAllThreadsSync();
  const operations = createUpdateDBOpsForThreadStoreThreadInfos(
    clientDBThreadInfos,
    migrationFunc,
  );
  const dbOperations =
    threadStoreOpsHandlers.convertOpsToClientDBOps(operations);

  try {
    commCoreModule.processThreadStoreOperationsSync(dbOperations);
  } catch (exception) {
    console.log(exception);
    if (handleMigrationFailure) {
      return handleMigrationFailure(state);
    }
    return ({ ...state, cookie: null }: any);
  }
  return state;
}

function deprecatedCreateUpdateDBOpsForMessageStoreMessages(
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
      isBackedUp: false,
    }));

  return [
    {
      type: 'remove_all',
    },
    ...replaceMessagesOperations,
  ];
}

function deprecatedCreateUpdateDBOpsForMessageStoreThreads(
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
      isBackedUp: false,
    },
  ];
}

export {
  updateClientDBThreadStoreThreadInfos,
  createUpdateDBOpsForThreadStoreThreadInfos,
  deprecatedCreateUpdateDBOpsForMessageStoreMessages,
  deprecatedCreateUpdateDBOpsForMessageStoreThreads,
};
