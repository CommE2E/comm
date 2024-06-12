// @flow

import _keyBy from 'lodash/fp/keyBy.js';

import {
  threadStoreOpsHandlers,
  type ClientDBThreadStoreOperation,
  type ReplaceThreadOperation,
  type ThreadStoreOperation,
} from '../../ops/thread-store-ops.js';
import type { RawThreadInfos, ThreadStore } from '../../types/thread-types.js';
import { entries } from '../../utils/objects.js';

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

export { updateThreadStoreThreadInfos };
