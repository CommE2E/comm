// @flow

import type { ClientDBReportStoreOperation } from 'lib/ops/report-store-ops.js';
import type { ClientDBUserStoreOperation } from 'lib/ops/user-store-ops.js';
import type {
  ClientDBDraftStoreOperation,
  DraftStoreOperation,
} from 'lib/types/draft-types.js';
import type {
  ClientDBStore,
  ClientDBStoreOperations,
} from 'lib/types/store-ops-types.js';

import type { ClientDBUserInfoWeb } from '../types/entiities.js';
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

function processUserStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  operations: $ReadOnlyArray<ClientDBUserStoreOperation>,
) {
  for (const operation: ClientDBUserStoreOperation of operations) {
    if (operation.type === 'remove_all_users') {
      sqliteQueryExecutor.removeAllUsers();
    } else if (operation.type === 'remove_users') {
      const { ids } = operation.payload;
      sqliteQueryExecutor.removeUsers(ids);
    } else if (operation.type === 'replace_user') {
      const { id, username, relationshipStatus, avatar } = operation.payload;
      sqliteQueryExecutor.replaceUserWeb({
        id,
        username: { isNull: !username, value: username ?? '' },
        relationshipStatus: {
          isNull: !relationshipStatus,
          value: relationshipStatus ?? '',
        },
        avatar: { isNull: !avatar, value: avatar ?? '' },
      });
    } else {
      throw new Error('Unsupported user operation');
    }
  }
}

function processDBStoreOperations(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  storeOperations: ClientDBStoreOperations,
) {
  const { draftStoreOperations, reportStoreOperations, userStoreOperations } =
    storeOperations;

  if (draftStoreOperations) {
    processDraftStoreOperations(sqliteQueryExecutor, draftStoreOperations);
  }
  if (reportStoreOperations) {
    processReportStoreOperations(sqliteQueryExecutor, reportStoreOperations);
  }
  if (userStoreOperations) {
    processUserStoreOperations(sqliteQueryExecutor, userStoreOperations);
  }
}

function getClientStore(
  sqliteQueryExecutor: SQLiteQueryExecutor,
): ClientDBStore {
  return {
    drafts: sqliteQueryExecutor.getAllDrafts(),
    messages: [],
    threads: [],
    messageStoreThreads: [],
    reports: sqliteQueryExecutor.getAllReports(),
    users: sqliteQueryExecutor
      .getAllUsersWeb()
      .map((user: ClientDBUserInfoWeb) => {
        const partialUserInfo = {
          id: user.id,
          username: user.username.isNull ? null : user.username.value,
          avatar: user.avatar.isNull ? null : user.avatar.value,
        };
        if (user.relationshipStatus.isNull) {
          return partialUserInfo;
        }
        return {
          ...partialUserInfo,
          relationshipStatus: user.relationshipStatus.value,
        };
      }),
  };
}

export { processDBStoreOperations, getClientStore };
