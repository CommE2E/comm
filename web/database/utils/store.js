// @flow

import { reportStoreOpsHandlers } from 'lib/ops/report-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import type {
  ClientStore,
  StoreOperations,
} from 'lib/types/store-ops-types.js';

import { workerRequestMessageTypes } from '../../types/worker-types.js';
import { getDatabaseModule } from '../database-module-provider.js';

async function getClientStore(): Promise<ClientStore> {
  const databaseModule = await getDatabaseModule();
  let result: ClientStore = {
    currentUserID: null,
    drafts: [],
    messages: null,
    threadStore: null,
    messageStoreThreads: null,
    reports: null,
    users: null,
  };
  const data = await databaseModule.schedule({
    type: workerRequestMessageTypes.GET_CLIENT_STORE,
  });
  if (data?.store?.drafts) {
    result = {
      ...result,
      drafts: data.store.drafts,
    };
  }
  if (data?.store?.reports) {
    result = {
      ...result,
      reports: reportStoreOpsHandlers.translateClientDBData(data.store.reports),
    };
  }
  if (data?.store?.threads && data.store.threads.length > 0) {
    result = {
      ...result,
      threadStore: {
        threadInfos: threadStoreOpsHandlers.translateClientDBData(
          data.store.threads,
        ),
      },
    };
  }
  return result;
}

async function processDBStoreOperations(
  storeOperations: StoreOperations,
): Promise<void> {
  const { draftStoreOperations, threadStoreOperations, reportStoreOperations } =
    storeOperations;

  const convertedThreadStoreOperations =
    threadStoreOpsHandlers.convertOpsToClientDBOps(threadStoreOperations);
  const convertedReportStoreOperations =
    reportStoreOpsHandlers.convertOpsToClientDBOps(reportStoreOperations);

  const databaseModule = await getDatabaseModule();
  const isSupported = await databaseModule.isDatabaseSupported();
  if (!isSupported) {
    return;
  }
  await databaseModule.schedule({
    type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
    storeOperations: {
      draftStoreOperations,
      reportStoreOperations: convertedReportStoreOperations,
      threadStoreOperations: convertedThreadStoreOperations,
    },
  });
}

export { getClientStore, processDBStoreOperations };
