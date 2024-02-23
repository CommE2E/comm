// @flow

import { keyserverStoreOpsHandlers } from 'lib/ops/keyserver-store-ops.js';
import { reportStoreOpsHandlers } from 'lib/ops/report-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import { canUseDatabaseOnWeb } from 'lib/shared/web-database.js';
import type {
  ClientStore,
  StoreOperations,
} from 'lib/types/store-ops-types.js';

import { defaultWebState } from '../../redux/default-state.js';
import { workerRequestMessageTypes } from '../../types/worker-types.js';
import { getCommSharedWorker } from '../shared-worker-provider.js';

async function getClientDBStore(): Promise<ClientStore> {
  const sharedWorker = await getCommSharedWorker();
  let result: ClientStore = {
    currentUserID: null,
    drafts: [],
    messages: null,
    threadStore: null,
    messageStoreThreads: null,
    reports: null,
    users: null,
    keyserverInfos: defaultWebState.keyserverStore.keyserverInfos,
  };
  const data = await sharedWorker.schedule({
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
  if (data?.store?.keyservers?.length) {
    result = {
      ...result,
      keyserverInfos: keyserverStoreOpsHandlers.translateClientDBData(
        data.store.keyservers,
      ),
    };
  }
  return result;
}

async function processDBStoreOperations(
  storeOperations: StoreOperations,
  userID: null | string,
): Promise<void> {
  const {
    draftStoreOperations,
    threadStoreOperations,
    reportStoreOperations,
    keyserverStoreOperations,
  } = storeOperations;

  const canUseDatabase = canUseDatabaseOnWeb(userID);

  const convertedThreadStoreOperations = canUseDatabase
    ? threadStoreOpsHandlers.convertOpsToClientDBOps(threadStoreOperations)
    : [];
  const convertedReportStoreOperations =
    reportStoreOpsHandlers.convertOpsToClientDBOps(reportStoreOperations);
  const convertedKeyserverStoreOperations =
    keyserverStoreOpsHandlers.convertOpsToClientDBOps(keyserverStoreOperations);

  if (
    convertedThreadStoreOperations.length === 0 &&
    convertedReportStoreOperations.length === 0 &&
    draftStoreOperations.length === 0 &&
    convertedKeyserverStoreOperations.length === 0
  ) {
    return;
  }

  const sharedWorker = await getCommSharedWorker();
  const isSupported = await sharedWorker.isSupported();
  if (!isSupported) {
    return;
  }
  try {
    await sharedWorker.schedule({
      type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
      storeOperations: {
        draftStoreOperations,
        reportStoreOperations: convertedReportStoreOperations,
        threadStoreOperations: convertedThreadStoreOperations,
        keyserverStoreOperations: convertedKeyserverStoreOperations,
      },
    });
  } catch (e) {
    console.log(e);
    if (canUseDatabase) {
      window.alert(e.message);
      if (threadStoreOperations.length > 0) {
        await sharedWorker.init({ clearDatabase: true });
        location.reload();
      }
    }
  }
}

export { getClientDBStore, processDBStoreOperations };
