// @flow

import _keyBy from 'lodash/fp/keyBy.js';

import {
  threadStoreOpsHandlers,
  type ClientDBThreadStoreOperation,
  type ReplaceThreadOperation,
  type ThreadStoreOperation,
} from '../../ops/thread-store-ops.js';
import type {
  RawThreadInfos,
  ThreadStore,
  ClientDBThreadInfo,
} from '../../types/thread-types.js';
import { entries, values } from '../../utils/objects.js';
import {
  convertClientDBThreadInfoToRawThreadInfo,
  convertRawThreadInfoToClientDBThreadInfo,
} from '../../utils/thread-ops-utils.js';

function updateThreadStoreThreadInfos(
  threadStore: ThreadStore,
  migrationFunc: RawThreadInfos => RawThreadInfos,
): {
  +newThreadStore: ThreadStore,
  +dbOperations: $ReadOnlyArray<ClientDBThreadStoreOperation>,
} {
  const rawThreadInfos = threadStore.threadInfos;

  // 1. Convert `RawThreadInfo`s to a map of `threadID` => `threadInfo`.
  const keyedRawThreadInfos = _keyBy('id')(rawThreadInfos);

  // 2. Apply `migrationFunc` to `ThreadInfo`s.
  const updatedKeyedRawThreadInfos = migrationFunc(keyedRawThreadInfos);

  // 3. Construct `replace` `ThreadStoreOperation`s.
  const replaceOps: $ReadOnlyArray<ReplaceThreadOperation> = entries(
    updatedKeyedRawThreadInfos,
  ).map(([id, threadInfo]) => ({
    type: 'replace',
    payload: { id, threadInfo },
  }));

  // 4. Prepend `replaceOps` with `remove_all` ops
  const operations: $ReadOnlyArray<ThreadStoreOperation> = [
    { type: 'remove_all' },
    ...replaceOps,
  ];

  // 5. Process `ThreadStoreOperation`s to get new `ThreadStore`.
  const newThreadStore: ThreadStore =
    threadStoreOpsHandlers.processStoreOperations(threadStore, operations);

  // 6. Convert `ThreadStoreOperation`s to `ClientDBThreadStoreOperation`s.
  const dbOperations: $ReadOnlyArray<ClientDBThreadStoreOperation> =
    threadStoreOpsHandlers.convertOpsToClientDBOps(operations);

  return {
    newThreadStore,
    dbOperations,
  };
}

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

export {
  updateThreadStoreThreadInfos,
  createUpdateDBOpsForThreadStoreThreadInfos,
};
