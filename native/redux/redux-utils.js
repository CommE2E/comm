// @flow

import { useSelector as reactReduxUseSelector } from 'react-redux';

import {
  keyserverStoreOpsHandlers,
  getKeyserversToRemoveFromNotifsStore,
} from 'lib/ops/keyserver-store-ops.js';
import { messageStoreOpsHandlers } from 'lib/ops/message-store-ops.js';
import { reportStoreOpsHandlers } from 'lib/ops/report-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import { userStoreOpsHandlers } from 'lib/ops/user-store-ops.js';
import type { StoreOperations } from 'lib/types/store-ops-types.js';

import type { AppState } from './state-types.js';
import { commCoreModule } from '../native-modules.js';
import { isTaskCancelledError } from '../utils/error-handling.js';

function useSelector<SS>(
  selector: (state: AppState) => SS,
  equalityFn?: (a: SS, b: SS) => boolean,
): SS {
  return reactReduxUseSelector(selector, equalityFn);
}

async function processDBStoreOperations(
  storeOperations: StoreOperations,
): Promise<void> {
  const {
    draftStoreOperations,
    threadStoreOperations,
    messageStoreOperations,
    reportStoreOperations,
    userStoreOperations,
    keyserverStoreOperations,
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
  const keyserversToRemoveFromNotifsStore =
    getKeyserversToRemoveFromNotifsStore(keyserverStoreOperations);

  try {
    const promises = [];
    if (convertedThreadStoreOperations.length > 0) {
      promises.push(
        commCoreModule.processThreadStoreOperations(
          convertedThreadStoreOperations,
        ),
      );
    }
    if (convertedMessageStoreOperations.length > 0) {
      promises.push(
        commCoreModule.processMessageStoreOperations(
          convertedMessageStoreOperations,
        ),
      );
    }
    if (draftStoreOperations.length > 0) {
      promises.push(
        commCoreModule.processDraftStoreOperations(draftStoreOperations),
      );
    }
    if (convertedReportStoreOperations.length > 0) {
      promises.push(
        commCoreModule.processReportStoreOperations(
          convertedReportStoreOperations,
        ),
      );
    }
    if (convertedUserStoreOperations.length > 0) {
      promises.push(
        commCoreModule.processUserStoreOperations(convertedUserStoreOperations),
      );
    }
    if (convertedKeyserverStoreOperations.length > 0) {
      promises.push(
        commCoreModule.processKeyserverStoreOperations(
          convertedKeyserverStoreOperations,
        ),
      );
    }
    if (keyserversToRemoveFromNotifsStore.length > 0) {
      promises.push(
        commCoreModule.removeKeyserverDataFromNotifStorage(
          keyserversToRemoveFromNotifsStore,
        ),
      );
    }
    await Promise.all(promises);
  } catch (e) {
    if (isTaskCancelledError(e)) {
      return;
    }
    // this code will make an entry in SecureStore and cause re-creating
    // database when user will open app again
    commCoreModule.reportDBOperationsFailure();
    commCoreModule.terminate();
  }
}

export { useSelector, processDBStoreOperations };
