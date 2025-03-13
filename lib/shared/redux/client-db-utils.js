// @flow

import _keyBy from 'lodash/fp/keyBy.js';

import { auxUserStoreOpsHandlers } from '../../ops/aux-user-store-ops.js';
import { communityStoreOpsHandlers } from '../../ops/community-store-ops.js';
import { convertDMOperationOpsToClientDBOps } from '../../ops/dm-operations-store-ops.js';
import { entryStoreOpsHandlers } from '../../ops/entries-store-ops.js';
import { integrityStoreOpsHandlers } from '../../ops/integrity-store-ops.js';
import { keyserverStoreOpsHandlers } from '../../ops/keyserver-store-ops.js';
import { messageStoreOpsHandlers } from '../../ops/message-store-ops.js';
import { reportStoreOpsHandlers } from '../../ops/report-store-ops.js';
import { syncedMetadataStoreOpsHandlers } from '../../ops/synced-metadata-store-ops.js';
import { threadActivityStoreOpsHandlers } from '../../ops/thread-activity-store-ops.js';
import { threadStoreOpsHandlers } from '../../ops/thread-store-ops.js';
import type { ThreadStoreOperation } from '../../ops/thread-store-ops.js';
import { userStoreOpsHandlers } from '../../ops/user-store-ops.js';
import type {
  ClientDBStoreOperations,
  StoreOperations,
} from '../../types/store-ops-types.js';
import type {
  RawThreadInfos,
  ClientDBThreadInfo,
} from '../../types/thread-types.js';
import { values } from '../../utils/objects.js';
import { convertClientDBThreadInfoToRawThreadInfo } from '../../utils/thread-ops-utils.js';

function createUpdateDBOpsForThreadStoreThreadInfos(
  clientDBThreadInfos: $ReadOnlyArray<ClientDBThreadInfo>,
  migrationFunc: RawThreadInfos => RawThreadInfos,
): $ReadOnlyArray<ThreadStoreOperation> {
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

  // 5. Construct `replace` `ThreadStoreOperation`s.
  const replaceThreadOperations = updatedKeyedRawThreadInfosArray.map(
    thread => ({
      type: 'replace',
      payload: {
        id: thread.id,
        threadInfo: thread,
      },
    }),
  );

  // 6. Prepend `replaceThreadOperations` with `remove_all` op and return.
  return [{ type: 'remove_all' }, ...replaceThreadOperations];
}

function convertStoreOperationsToClientDBStoreOperations(
  storeOperations: StoreOperations,
): ClientDBStoreOperations {
  const {
    draftStoreOperations,
    threadStoreOperations,
    messageStoreOperations,
    reportStoreOperations,
    keyserverStoreOperations,
    userStoreOperations,
    integrityStoreOperations,
    communityStoreOperations,
    syncedMetadataStoreOperations,
    auxUserStoreOperations,
    threadActivityStoreOperations,
    outboundP2PMessages,
    entryStoreOperations,
    messageSearchStoreOperations,
    dmOperationStoreOperations,
  } = storeOperations;

  const convertedThreadStoreOperations =
    threadStoreOpsHandlers.convertOpsToClientDBOps(threadStoreOperations);
  const convertedMessageStoreOperations =
    messageStoreOpsHandlers.convertOpsToClientDBOps(messageStoreOperations);
  const convertedReportStoreOperations =
    reportStoreOpsHandlers.convertOpsToClientDBOps(reportStoreOperations);
  const convertedUserStoreOperations =
    userStoreOpsHandlers.convertOpsToClientDBOps(userStoreOperations);
  const convertedKeyserverStoreOperations =
    keyserverStoreOpsHandlers.convertOpsToClientDBOps(keyserverStoreOperations);
  const convertedCommunityStoreOperations =
    communityStoreOpsHandlers.convertOpsToClientDBOps(communityStoreOperations);
  const convertedSyncedMetadataStoreOperations =
    syncedMetadataStoreOpsHandlers.convertOpsToClientDBOps(
      syncedMetadataStoreOperations,
    );
  const convertedIntegrityStoreOperations =
    integrityStoreOpsHandlers.convertOpsToClientDBOps(integrityStoreOperations);
  const convertedAuxUserStoreOperations =
    auxUserStoreOpsHandlers.convertOpsToClientDBOps(auxUserStoreOperations);
  const convertedThreadActivityStoreOperations =
    threadActivityStoreOpsHandlers.convertOpsToClientDBOps(
      threadActivityStoreOperations,
    );
  const convertedEntryStoreOperations =
    entryStoreOpsHandlers.convertOpsToClientDBOps(entryStoreOperations);
  const convertedDMOperationStoreOperations =
    convertDMOperationOpsToClientDBOps(dmOperationStoreOperations);

  return {
    draftStoreOperations: draftStoreOperations,
    threadStoreOperations: convertedThreadStoreOperations,
    messageStoreOperations: convertedMessageStoreOperations,
    reportStoreOperations: convertedReportStoreOperations,
    userStoreOperations: convertedUserStoreOperations,
    keyserverStoreOperations: convertedKeyserverStoreOperations,
    communityStoreOperations: convertedCommunityStoreOperations,
    integrityStoreOperations: convertedIntegrityStoreOperations,
    syncedMetadataStoreOperations: convertedSyncedMetadataStoreOperations,
    auxUserStoreOperations: convertedAuxUserStoreOperations,
    threadActivityStoreOperations: convertedThreadActivityStoreOperations,
    outboundP2PMessages,
    entryStoreOperations: convertedEntryStoreOperations,
    messageSearchStoreOperations,
    dmOperationStoreOperations: convertedDMOperationStoreOperations,
  };
}

export {
  createUpdateDBOpsForThreadStoreThreadInfos,
  convertStoreOperationsToClientDBStoreOperations,
};
