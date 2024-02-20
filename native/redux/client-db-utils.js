// @flow

import _keyBy from 'lodash/fp/keyBy.js';

import type { ClientDBMessageStoreOperation } from 'lib/ops/message-store-ops.js';
import type { ClientDBThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import type {
  RawMessageInfo,
  ClientDBMessageInfo,
  ClientDBThreadMessageInfo,
} from 'lib/types/message-types.js';
import type {
  ClientDBThreadInfo,
  RawThreadInfos,
} from 'lib/types/thread-types.js';
import {
  translateClientDBMessageInfoToRawMessageInfo,
  translateRawMessageInfoToClientDBMessageInfo,
  translateClientDBThreadMessageInfos,
  translateThreadMessageInfoToClientDBThreadMessageInfo,
  type TranslatedThreadMessageInfos,
} from 'lib/utils/message-ops-utils.js';
import { entries, values } from 'lib/utils/objects.js';
import {
  convertClientDBThreadInfoToRawThreadInfo,
  convertRawThreadInfoToClientDBThreadInfo,
} from 'lib/utils/thread-ops-utils.js';

function createUpdateDBOpsForThreadStoreThreadInfos(
  clientDBThreadInfos: $ReadOnlyArray<ClientDBThreadInfo>,
  migrationFunc: RawThreadInfos => RawThreadInfos,
): $ReadOnlyArray<ClientDBThreadStoreOperation> {
  // 1. Translate `ClientDBThreadInfo`s to `RawThreadInfo`s.
  const rawThreadInfos = clientDBThreadInfos.map(
    convertClientDBThreadInfoToRawThreadInfo,
  );

  // 2. Convert `RawThreadInfo`s to a map of `threadID` => `threadInfo`.
  const keyedRawThreadInfos = _keyBy('id')(rawThreadInfos);

  // 3. Apply `migrationFunc` to `ThreadInfo`s.
  const updatedKeyedRawThreadInfos = migrationFunc(keyedRawThreadInfos);

  // 4. Convert the updated `RawThreadInfos` back into an array.
  const updatedKeyedRawThreadInfosArray = values(updatedKeyedRawThreadInfos);

  // 5. Translate `RawThreadInfo`s back to `ClientDBThreadInfo`s.
  const updatedClientDBThreadInfos = updatedKeyedRawThreadInfosArray.map(
    convertRawThreadInfoToClientDBThreadInfo,
  );

  // 6. Construct `replace` `ClientDBThreadStoreOperation`s.
  const replaceThreadOperations = updatedClientDBThreadInfos.map(thread => ({
    type: 'replace',
    payload: thread,
  }));

  // 7. Prepend `replaceThreadOperations` with `remove_all` op and return.
  return [{ type: 'remove_all' }, ...replaceThreadOperations];
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
  createUpdateDBOpsForThreadStoreThreadInfos,
  createUpdateDBOpsForMessageStoreMessages,
  createUpdateDBOpsForMessageStoreThreads,
};
