// @flow

import { useSelector as reactReduxUseSelector } from 'react-redux';

import { auxUserStoreOpsHandlers } from 'lib/ops/aux-user-store-ops.js';
import { communityStoreOpsHandlers } from 'lib/ops/community-store-ops.js';
import { integrityStoreOpsHandlers } from 'lib/ops/integrity-store-ops.js';
import {
  keyserverStoreOpsHandlers,
  getKeyserversToRemoveFromNotifsStore,
} from 'lib/ops/keyserver-store-ops.js';
import { messageStoreOpsHandlers } from 'lib/ops/message-store-ops.js';
import { reportStoreOpsHandlers } from 'lib/ops/report-store-ops.js';
import { syncedMetadataStoreOpsHandlers } from 'lib/ops/synced-metadata-store-ops.js';
import { threadActivityStoreOpsHandlers } from 'lib/ops/thread-activity-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import { userStoreOpsHandlers } from 'lib/ops/user-store-ops.js';
import type { StoreOperations } from 'lib/types/store-ops-types.js';
import { values } from 'lib/utils/objects.js';

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
    integrityStoreOperations,
    communityStoreOperations,
    syncedMetadataStoreOperations,
    auxUserStoreOperations,
    threadActivityStoreOperations,
    outboundP2PMessages,
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
  const keyserversToRemoveFromNotifsStore =
    getKeyserversToRemoveFromNotifsStore(keyserverStoreOperations ?? []);
  const convertedIntegrityStoreOperations =
    integrityStoreOpsHandlers.convertOpsToClientDBOps(integrityStoreOperations);
  const convertedAuxUserStoreOperations =
    auxUserStoreOpsHandlers.convertOpsToClientDBOps(auxUserStoreOperations);
  const convertedThreadActivityStoreOperations =
    threadActivityStoreOpsHandlers.convertOpsToClientDBOps(
      threadActivityStoreOperations,
    );

  try {
    const promises = [];
    if (keyserversToRemoveFromNotifsStore.length > 0) {
      promises.push(
        commCoreModule.removeKeyserverDataFromNotifStorage(
          keyserversToRemoveFromNotifsStore,
        ),
      );
    }

    const dbOps = {
      draftStoreOperations,
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
    };
    if (values(dbOps).some(ops => ops && ops.length > 0)) {
      promises.push(commCoreModule.processDBStoreOperations(dbOps));
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
