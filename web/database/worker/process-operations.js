// @flow

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

function processDBStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  storeOperations: ClientDBStoreOperations,
  module: EmscriptenModule,
) {
  const { draftStoreOperations, reportStoreOperations, threadStoreOperations } =
    storeOperations;

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
    sqliteQueryExecutor.commitTransaction();
  } catch (e) {
    sqliteQueryExecutor.rollbackTransaction();
    console.log('Error while processing store ops: ', e);
    throw e;
  }
}

function getClientStore(
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
  };
}

export { processDBStoreOperations, getClientStore };
