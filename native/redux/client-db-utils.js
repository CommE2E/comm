// @flow

import type { ClientDBMessageStoreOperation } from 'lib/ops/message-store-ops.js';
import type {
  ClientDBMessageInfo,
  ClientDBThreadMessageInfo,
  RawMessageInfo,
} from 'lib/types/message-types.js';
import {
  translateClientDBMessageInfoToRawMessageInfo,
  translateClientDBThreadMessageInfos,
  type TranslatedThreadMessageInfos,
  translateRawMessageInfoToClientDBMessageInfo,
  translateThreadMessageInfoToClientDBThreadMessageInfo,
} from 'lib/utils/message-ops-utils.js';
import { entries } from 'lib/utils/objects.js';

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
  createUpdateDBOpsForMessageStoreMessages,
  createUpdateDBOpsForMessageStoreThreads,
};
