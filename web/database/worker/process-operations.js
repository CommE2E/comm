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

import {
  clientDBThreadInfoToWebThread,
  webThreadToClientDBThreadInfo,
} from '../types/entities.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';

function processDraftStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBDraftStoreOperation>,
) {
  for (const operation: DraftStoreOperation of operations) {
    if (operation.type === 'remove_all') {
      sqliteQueryExecutor.removeAllDrafts();
    } else if (operation.type === 'update') {
      const { key, text } = operation.payload;
      sqliteQueryExecutor.updateDraft(key, text);
    } else if (operation.type === 'move') {
      const { oldKey, newKey } = operation.payload;
      sqliteQueryExecutor.moveDraft(oldKey, newKey);
    } else {
      throw new Error('Unsupported draft operation');
    }
  }
}

function processReportStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBReportStoreOperation>,
) {
  for (const operation: ClientDBReportStoreOperation of operations) {
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
  }
}

function processThreadStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBThreadStoreOperation>,
) {
  for (const operation: ClientDBThreadStoreOperation of operations) {
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
  }
}

function processDBStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  storeOperations: ClientDBStoreOperations,
) {
  const { draftStoreOperations, reportStoreOperations, threadStoreOperations } =
    storeOperations;

  if (draftStoreOperations) {
    processDraftStoreOperations(sqliteQueryExecutor, draftStoreOperations);
  }
  if (reportStoreOperations) {
    processReportStoreOperations(sqliteQueryExecutor, reportStoreOperations);
  }
  if (threadStoreOperations) {
    processThreadStoreOperations(sqliteQueryExecutor, threadStoreOperations);
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
