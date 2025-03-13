// @flow

import type { ClientDBMessageSearchStoreOperation } from 'lib/message-search-types.js';
import type { ClientDBAuxUserStoreOperation } from 'lib/ops/aux-user-store-ops.js';
import type { ClientDBCommunityStoreOperation } from 'lib/ops/community-store-ops.js';
import type { ClientDBDMOperationStoreOperation } from 'lib/ops/dm-operations-store-ops.js';
import type { ClientDBEntryStoreOperation } from 'lib/ops/entries-store-ops.js';
import type { ClientDBIntegrityStoreOperation } from 'lib/ops/integrity-store-ops.js';
import type { ClientDBKeyserverStoreOperation } from 'lib/ops/keyserver-store-ops.js';
import type { ClientDBMessageStoreOperation } from 'lib/ops/message-store-ops.js';
import type { ClientDBReportStoreOperation } from 'lib/ops/report-store-ops.js';
import type { ClientDBSyncedMetadataStoreOperation } from 'lib/ops/synced-metadata-store-ops.js';
import type { ClientDBThreadActivityStoreOperation } from 'lib/ops/thread-activity-store-ops.js';
import type { ClientDBThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import type { ClientDBUserStoreOperation } from 'lib/ops/user-store-ops.js';
import type {
  ClientDBDraftStoreOperation,
  DraftStoreOperation,
} from 'lib/types/draft-types.js';
import type {
  ClientDBStore,
  ClientDBStoreOperations,
} from 'lib/types/store-ops-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import {
  clientDBThreadInfoToWebThread,
  webThreadToClientDBThreadInfo,
  webMessageToClientDBMessageInfo,
  clientDBMessageInfoToWebMessage,
} from '../types/entities.js';
import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';

function getProcessingStoreOpsExceptionMessage(
  e: mixed,
  module: EmscriptenModule,
): string {
  if (typeof e === 'number') {
    return module.getExceptionMessage(e);
  }
  return getMessageForException(e) ?? 'unknown error';
}
function processDraftStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBDraftStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: DraftStoreOperation of operations) {
    try {
      if (operation.type === 'remove_all') {
        sqliteQueryExecutor.removeAllDrafts();
      } else if (operation.type === 'remove') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeDrafts(ids);
      } else if (operation.type === 'update') {
        const { key, text } = operation.payload;
        sqliteQueryExecutor.updateDraft(key, text);
      } else if (operation.type === 'move') {
        const { oldKey, newKey } = operation.payload;
        sqliteQueryExecutor.moveDraft(oldKey, newKey);
      } else {
        throw new Error('Unsupported draft operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } draft operation: ${getProcessingStoreOpsExceptionMessage(e, module)}`,
      );
    }
  }
}

function processReportStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBReportStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: ClientDBReportStoreOperation of operations) {
    try {
      if (operation.type === 'remove_all_reports') {
        sqliteQueryExecutor.removeAllReports();
      } else if (operation.type === 'remove_reports') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeReports(ids);
      } else if (operation.type === 'replace_report') {
        const { id, report } = operation.payload;
        sqliteQueryExecutor.replaceReport({ id, report });
      } else {
        throw new Error('Unsupported report operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } report operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function processThreadStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBThreadStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: ClientDBThreadStoreOperation of operations) {
    try {
      if (operation.type === 'remove_all') {
        sqliteQueryExecutor.removeAllThreads();
      } else if (operation.type === 'remove') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeThreads(ids);
      } else if (operation.type === 'replace') {
        sqliteQueryExecutor.replaceThreadWeb(
          clientDBThreadInfoToWebThread(operation.payload),
        );
      } else {
        throw new Error('Unsupported thread operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } thread operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function processKeyserverStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBKeyserverStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: ClientDBKeyserverStoreOperation of operations) {
    try {
      if (operation.type === 'remove_all_keyservers') {
        sqliteQueryExecutor.removeAllKeyservers();
      } else if (operation.type === 'remove_keyservers') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeKeyservers(ids);
      } else if (operation.type === 'replace_keyserver') {
        const { id, keyserverInfo, syncedKeyserverInfo } = operation.payload;
        sqliteQueryExecutor.replaceKeyserver({
          id,
          keyserverInfo,
          syncedKeyserverInfo,
        });
      } else {
        throw new Error('Unsupported keyserver operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } keyserver operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function processCommunityStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBCommunityStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: ClientDBCommunityStoreOperation of operations) {
    try {
      if (operation.type === 'remove_all_communities') {
        sqliteQueryExecutor.removeAllCommunities();
      } else if (operation.type === 'remove_communities') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeCommunities(ids);
      } else if (operation.type === 'replace_community') {
        const { id, communityInfo } = operation.payload;
        sqliteQueryExecutor.replaceCommunity({ id, communityInfo });
      } else {
        throw new Error('Unsupported community operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } community operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function processIntegrityStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBIntegrityStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: ClientDBIntegrityStoreOperation of operations) {
    try {
      if (operation.type === 'remove_all_integrity_thread_hashes') {
        sqliteQueryExecutor.removeAllIntegrityThreadHashes();
      } else if (operation.type === 'remove_integrity_thread_hashes') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeIntegrityThreadHashes(ids);
      } else if (operation.type === 'replace_integrity_thread_hashes') {
        const { threadHashes } = operation.payload;
        sqliteQueryExecutor.replaceIntegrityThreadHashes(threadHashes);
      } else {
        throw new Error('Unsupported integrity operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } integrity operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function processSyncedMetadataStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBSyncedMetadataStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: ClientDBSyncedMetadataStoreOperation of operations) {
    try {
      if (operation.type === 'remove_all_synced_metadata') {
        sqliteQueryExecutor.removeAllSyncedMetadata();
      } else if (operation.type === 'remove_synced_metadata') {
        const { names } = operation.payload;
        sqliteQueryExecutor.removeSyncedMetadata(names);
      } else if (operation.type === 'replace_synced_metadata_entry') {
        const { name, data } = operation.payload;
        sqliteQueryExecutor.replaceSyncedMetadataEntry({ name, data });
      } else {
        throw new Error('Unsupported synced metadata operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } synced metadata operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function processMessageStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBMessageStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation of operations) {
    try {
      if (operation.type === 'rekey') {
        const { from, to } = operation.payload;
        sqliteQueryExecutor.rekeyMessage(from, to);
      } else if (operation.type === 'remove') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeMessages(ids);
      } else if (operation.type === 'replace') {
        const { message, medias } = clientDBMessageInfoToWebMessage(
          operation.payload,
        );
        sqliteQueryExecutor.replaceMessageWeb(message);
        for (const media of medias) {
          sqliteQueryExecutor.replaceMedia(media);
        }
      } else if (operation.type === 'remove_all') {
        sqliteQueryExecutor.removeAllMessages();
        sqliteQueryExecutor.removeAllMedia();
      } else if (operation.type === 'remove_threads') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeMessageStoreThreads(ids);
      } else if (operation.type === 'replace_threads') {
        const { threads } = operation.payload;

        sqliteQueryExecutor.replaceMessageStoreThreads(
          threads.map(({ id, start_reached }) => ({
            id,
            startReached: Number(start_reached),
          })),
        );
      } else if (operation.type === 'remove_all_threads') {
        sqliteQueryExecutor.removeAllMessageStoreThreads();
      } else if (operation.type === 'remove_messages_for_threads') {
        const { threadIDs } = operation.payload;
        sqliteQueryExecutor.removeMessagesForThreads(threadIDs);
      } else if (operation.type === 'replace_local_message_info') {
        const { id, localMessageInfo } = operation.payload;
        sqliteQueryExecutor.replaceMessageStoreLocalMessageInfo({
          id,
          localMessageInfo,
        });
      } else if (operation.type === 'remove_local_message_infos') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeMessageStoreLocalMessageInfos(ids);
      } else if (operation.type === 'remove_all_local_message_infos') {
        sqliteQueryExecutor.removeAllMessageStoreLocalMessageInfos();
      } else {
        throw new Error('Unsupported message operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } message operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function processUserStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBUserStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation of operations) {
    try {
      if (operation.type === 'remove_users') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeUsers(ids);
      } else if (operation.type === 'replace_user') {
        const user = operation.payload;
        sqliteQueryExecutor.replaceUser(user);
      } else if (operation.type === 'remove_all_users') {
        sqliteQueryExecutor.removeAllUsers();
      } else {
        throw new Error('Unsupported user operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } user operation: ${getProcessingStoreOpsExceptionMessage(e, module)}`,
      );
    }
  }
}

function processDBStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  storeOperations: ClientDBStoreOperations,
  module: EmscriptenModule,
) {
  const {
    draftStoreOperations,
    reportStoreOperations,
    threadStoreOperations,
    keyserverStoreOperations,
    communityStoreOperations,
    integrityStoreOperations,
    syncedMetadataStoreOperations,
    auxUserStoreOperations,
    userStoreOperations,
    messageStoreOperations,
    threadActivityStoreOperations,
    outboundP2PMessages,
    entryStoreOperations,
    messageSearchStoreOperations,
    dmOperationStoreOperations,
  } = storeOperations;

  try {
    sqliteQueryExecutor.beginTransaction();
    if (draftStoreOperations && draftStoreOperations.length > 0) {
      processDraftStoreOperations(
        sqliteQueryExecutor,
        draftStoreOperations,
        module,
      );
    }
    if (reportStoreOperations && reportStoreOperations.length > 0) {
      processReportStoreOperations(
        sqliteQueryExecutor,
        reportStoreOperations,
        module,
      );
    }
    if (threadStoreOperations && threadStoreOperations.length > 0) {
      processThreadStoreOperations(
        sqliteQueryExecutor,
        threadStoreOperations,
        module,
      );
    }
    if (keyserverStoreOperations && keyserverStoreOperations.length > 0) {
      processKeyserverStoreOperations(
        sqliteQueryExecutor,
        keyserverStoreOperations,
        module,
      );
    }
    if (communityStoreOperations && communityStoreOperations.length > 0) {
      processCommunityStoreOperations(
        sqliteQueryExecutor,
        communityStoreOperations,
        module,
      );
    }
    if (integrityStoreOperations && integrityStoreOperations.length > 0) {
      processIntegrityStoreOperations(
        sqliteQueryExecutor,
        integrityStoreOperations,
        module,
      );
    }
    if (
      syncedMetadataStoreOperations &&
      syncedMetadataStoreOperations.length > 0
    ) {
      processSyncedMetadataStoreOperations(
        sqliteQueryExecutor,
        syncedMetadataStoreOperations,
        module,
      );
    }
    if (auxUserStoreOperations && auxUserStoreOperations.length > 0) {
      processAuxUserStoreOperations(
        sqliteQueryExecutor,
        auxUserStoreOperations,
        module,
      );
    }
    if (userStoreOperations && userStoreOperations.length > 0) {
      processUserStoreOperations(
        sqliteQueryExecutor,
        userStoreOperations,
        module,
      );
    }
    if (messageStoreOperations && messageStoreOperations.length > 0) {
      processMessageStoreOperations(
        sqliteQueryExecutor,
        messageStoreOperations,
        module,
      );
    }
    if (
      threadActivityStoreOperations &&
      threadActivityStoreOperations.length > 0
    ) {
      processThreadActivityStoreOperations(
        sqliteQueryExecutor,
        threadActivityStoreOperations,
        module,
      );
    }
    if (outboundP2PMessages && outboundP2PMessages.length > 0) {
      sqliteQueryExecutor.addOutboundP2PMessages(outboundP2PMessages);
    }
    if (entryStoreOperations && entryStoreOperations.length > 0) {
      processEntryStoreOperations(
        sqliteQueryExecutor,
        entryStoreOperations,
        module,
      );
    }
    if (
      messageSearchStoreOperations &&
      messageSearchStoreOperations.length > 0
    ) {
      processMessageSearchStoreOperations(
        sqliteQueryExecutor,
        messageSearchStoreOperations,
        module,
      );
    }
    if (dmOperationStoreOperations && dmOperationStoreOperations.length > 0) {
      processDMOperationStoreOperations(
        sqliteQueryExecutor,
        dmOperationStoreOperations,
        module,
      );
    }
    sqliteQueryExecutor.commitTransaction();
  } catch (e) {
    sqliteQueryExecutor.rollbackTransaction();
    console.log('Error while processing store ops: ', e);
    throw e;
  }
}

function processAuxUserStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBAuxUserStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: ClientDBAuxUserStoreOperation of operations) {
    try {
      if (operation.type === 'remove_all_aux_user_infos') {
        sqliteQueryExecutor.removeAllAuxUserInfos();
      } else if (operation.type === 'remove_aux_user_infos') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeAuxUserInfos(ids);
      } else if (operation.type === 'replace_aux_user_info') {
        const { id, auxUserInfo } = operation.payload;
        sqliteQueryExecutor.replaceAuxUserInfo({ id, auxUserInfo });
      } else {
        throw new Error('Unsupported aux user operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } aux user operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function processThreadActivityStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBThreadActivityStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: ClientDBThreadActivityStoreOperation of operations) {
    try {
      if (operation.type === 'remove_all_thread_activity_entries') {
        sqliteQueryExecutor.removeAllThreadActivityEntries();
      } else if (operation.type === 'remove_thread_activity_entries') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeThreadActivityEntries(ids);
      } else if (operation.type === 'replace_thread_activity_entry') {
        const { id, threadActivityStoreEntry } = operation.payload;
        sqliteQueryExecutor.replaceThreadActivityEntry({
          id,
          threadActivityStoreEntry,
        });
      } else {
        throw new Error('Unsupported thread activity operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } thread activity operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function processEntryStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBEntryStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: ClientDBEntryStoreOperation of operations) {
    try {
      if (operation.type === 'remove_all_entries') {
        sqliteQueryExecutor.removeAllEntries();
      } else if (operation.type === 'remove_entries') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeEntries(ids);
      } else if (operation.type === 'replace_entry') {
        const { id, entry } = operation.payload;
        sqliteQueryExecutor.replaceEntry({ id, entry });
      } else {
        throw new Error('Unsupported entry store operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } entry store operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function processMessageSearchStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBMessageSearchStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: ClientDBMessageSearchStoreOperation of operations) {
    try {
      if (operation.type === 'update_search_messages') {
        const { originalMessageID, messageID, content } = operation.payload;
        sqliteQueryExecutor.updateMessageSearchIndex(
          originalMessageID,
          messageID,
          content,
        );
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } message search operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function processDMOperationStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBDMOperationStoreOperation>,
  module: EmscriptenModule,
) {
  for (const operation: ClientDBDMOperationStoreOperation of operations) {
    try {
      if (operation.type === 'remove_all_dm_operations') {
        sqliteQueryExecutor.removeAllDMOperations();
      } else if (operation.type === 'remove_dm_operations') {
        const { ids } = operation.payload;
        sqliteQueryExecutor.removeDMOperations(ids);
      } else if (operation.type === 'replace_dm_operation') {
        const { id, type, operation: dmOperation } = operation.payload;
        sqliteQueryExecutor.replaceDMOperation({
          id,
          type,
          operation: dmOperation,
        });
      } else {
        throw new Error('Unsupported DMOperation operation');
      }
    } catch (e) {
      throw new Error(
        `Error while processing ${
          operation.type
        } DMOperation operation: ${getProcessingStoreOpsExceptionMessage(
          e,
          module,
        )}`,
      );
    }
  }
}

function getClientStoreFromQueryExecutor(
  sqliteQueryExecutor: SQLiteQueryExecutor,
): ClientDBStore {
  return {
    drafts: sqliteQueryExecutor.getAllDrafts(),
    messages: sqliteQueryExecutor
      .getInitialMessagesWeb()
      .map(webMessageToClientDBMessageInfo),
    threads: sqliteQueryExecutor
      .getAllThreadsWeb()
      .map(webThreadToClientDBThreadInfo),
    messageStoreThreads: sqliteQueryExecutor
      .getAllMessageStoreThreads()
      .map(({ id, startReached }) => ({
        id,
        start_reached: startReached.toString(),
      })),
    reports: sqliteQueryExecutor.getAllReports(),
    users: sqliteQueryExecutor.getAllUsers(),
    keyservers: sqliteQueryExecutor.getAllKeyservers(),
    communities: sqliteQueryExecutor.getAllCommunities(),
    integrityThreadHashes: sqliteQueryExecutor.getAllIntegrityThreadHashes(),
    syncedMetadata: sqliteQueryExecutor.getAllSyncedMetadata(),
    auxUserInfos: sqliteQueryExecutor.getAllAuxUserInfos(),
    threadActivityEntries: sqliteQueryExecutor.getAllThreadActivityEntries(),
    entries: sqliteQueryExecutor.getAllEntries(),
    messageStoreLocalMessageInfos:
      sqliteQueryExecutor.getAllMessageStoreLocalMessageInfos(),
    dmOperations: sqliteQueryExecutor.getAllDMOperations(),
  };
}

export {
  processDBStoreOperations,
  getProcessingStoreOpsExceptionMessage,
  getClientStoreFromQueryExecutor,
};
