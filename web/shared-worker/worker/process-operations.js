// @flow

import type { ClientDBCommunityStoreOperation } from 'lib/ops/community-store-ops.js';
import type { ClientDBIntegrityStoreOperation } from 'lib/ops/integrity-store-ops.js';
import type { ClientDBKeyserverStoreOperation } from 'lib/ops/keyserver-store-ops.js';
import type { ClientDBReportStoreOperation } from 'lib/ops/report-store-ops.js';
import type { ClientDBThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
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
        const { id, keyserverInfo } = operation.payload;
        sqliteQueryExecutor.replaceKeyserver({ id, keyserverInfo });
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
    sqliteQueryExecutor.commitTransaction();
  } catch (e) {
    sqliteQueryExecutor.rollbackTransaction();
    console.log('Error while processing store ops: ', e);
    throw e;
  }
}

function getClientStoreFromQueryExecutor(
  sqliteQueryExecutor: SQLiteQueryExecutor,
): ClientDBStore {
  return {
    drafts: sqliteQueryExecutor.getAllDrafts(),
    messages: [],
    threads: sqliteQueryExecutor
      .getAllThreadsWeb()
      .map(t => webThreadToClientDBThreadInfo(t)),
    messageStoreThreads: [],
    reports: sqliteQueryExecutor.getAllReports(),
    users: [],
    keyservers: sqliteQueryExecutor.getAllKeyservers(),
    communities: sqliteQueryExecutor.getAllCommunities(),
    integrityThreadHashes: sqliteQueryExecutor.getAllIntegrityThreadHashes(),
  };
}

export {
  processDBStoreOperations,
  getProcessingStoreOpsExceptionMessage,
  getClientStoreFromQueryExecutor,
};
