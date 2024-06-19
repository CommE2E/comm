// @flow

import _keyBy from 'lodash/fp/keyBy.js';

import type { ClientDBThreadStoreOperation } from '../../ops/thread-store-ops.js';
import type {
  RawThreadInfos,
  ClientDBThreadInfo,
} from '../../types/thread-types.js';
import { values } from '../../utils/objects.js';
import {
  convertClientDBThreadInfoToRawThreadInfo,
  convertRawThreadInfoToClientDBThreadInfo,
} from '../../utils/thread-ops-utils.js';

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

export { createUpdateDBOpsForThreadStoreThreadInfos };
