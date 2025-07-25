// @flow

import { auxUserStoreOpsHandlers } from 'lib/ops/aux-user-store-ops.js';
import { communityStoreOpsHandlers } from 'lib/ops/community-store-ops.js';
import {
  convertClientDBDMOperationToDMOperation,
  dmOperationsStoreOpsHandlers,
} from 'lib/ops/dm-operations-store-ops.js';
import { entryStoreOpsHandlers } from 'lib/ops/entries-store-ops.js';
import { holderStoreOpsHandlers } from 'lib/ops/holder-store-ops.js';
import { integrityStoreOpsHandlers } from 'lib/ops/integrity-store-ops.js';
import { keyserverStoreOpsHandlers } from 'lib/ops/keyserver-store-ops.js';
import { reportStoreOpsHandlers } from 'lib/ops/report-store-ops.js';
import { syncedMetadataStoreOpsHandlers } from 'lib/ops/synced-metadata-store-ops.js';
import { threadActivityStoreOpsHandlers } from 'lib/ops/thread-activity-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import { userStoreOpsHandlers } from 'lib/ops/user-store-ops.js';
import type { DatabaseIdentifier } from 'lib/types/database-identifier-types';
import type { ClientStore } from 'lib/types/store-ops-types.js';
import { translateClientDBLocalMessageInfos } from 'lib/utils/message-ops-utils.js';

import { commCoreModule } from '../native-modules.js';

async function getClientDBStore(
  dbID: DatabaseIdentifier,
  currentUserID: ?string,
): Promise<ClientStore> {
  const {
    threads,
    messages,
    drafts,
    messageStoreThreads,
    reports,
    users,
    keyservers,
    communities,
    integrityThreadHashes,
    syncedMetadata,
    auxUserInfos,
    threadActivityEntries,
    entries,
    messageStoreLocalMessageInfos,
    dmOperations,
    holders,
    queuedDMOperations,
  } = await commCoreModule.getClientDBStore(dbID);
  const threadInfosFromDB =
    threadStoreOpsHandlers.translateClientDBData(threads);
  const reportsFromDB = reportStoreOpsHandlers.translateClientDBData(reports);
  const usersFromDB = userStoreOpsHandlers.translateClientDBData(users);
  const keyserverInfosFromDB =
    keyserverStoreOpsHandlers.translateClientDBData(keyservers);
  const communityInfosFromDB =
    communityStoreOpsHandlers.translateClientDBData(communities);
  const threadHashesFromDB = integrityStoreOpsHandlers.translateClientDBData(
    integrityThreadHashes,
  );
  const syncedMetadataFromDB =
    syncedMetadataStoreOpsHandlers.translateClientDBData(syncedMetadata);
  const auxUserInfosFromDB =
    auxUserStoreOpsHandlers.translateClientDBData(auxUserInfos);
  const threadActivityStoreFromDB =
    threadActivityStoreOpsHandlers.translateClientDBData(threadActivityEntries);
  const entriesFromDB = entryStoreOpsHandlers.translateClientDBData(entries);
  const localMessageInfosFromDB = translateClientDBLocalMessageInfos(
    messageStoreLocalMessageInfos,
  );
  const dmOperationsFromDB = dmOperations.map(
    convertClientDBDMOperationToDMOperation,
  );
  const holdersFromDB = holderStoreOpsHandlers.translateClientDBData(holders);
  const queuedDMOperationsFromDB =
    dmOperationsStoreOpsHandlers.translateClientDBData(queuedDMOperations);

  return {
    drafts,
    messages,
    threadStore: { threadInfos: threadInfosFromDB },
    currentUserID,
    messageStoreThreads,
    reports: reportsFromDB,
    users: usersFromDB,
    keyserverInfos: keyserverInfosFromDB,
    communityInfos: communityInfosFromDB,
    threadHashes: threadHashesFromDB,
    syncedMetadata: syncedMetadataFromDB,
    auxUserInfos: auxUserInfosFromDB,
    threadActivityStore: threadActivityStoreFromDB,
    entries: entriesFromDB,
    messageStoreLocalMessageInfos: localMessageInfosFromDB,
    dmOperations: dmOperationsFromDB,
    holders: holdersFromDB,
    queuedDMOperations: queuedDMOperationsFromDB,
  };
}

export { getClientDBStore };
