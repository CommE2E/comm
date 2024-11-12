// @flow

import { getKeyserversToRemoveFromNotifsStore } from 'lib/ops/keyserver-store-ops.js';
import { convertStoreOperationsToClientDBStoreOperations } from 'lib/shared/redux/client-db-utils.js';
import type { SQLiteAPI } from 'lib/types/sqlite-types.js';
import type { StoreOperations } from 'lib/types/store-ops-types';
import { values } from 'lib/utils/objects.js';

import { commCoreModule } from '../native-modules.js';
import { isTaskCancelledError } from '../utils/error-handling.js';

const sqliteAPI: SQLiteAPI = {
  // read operations
  getAllInboundP2PMessages: commCoreModule.getAllInboundP2PMessages,
  getUnsentOutboundP2PMessages: commCoreModule.getUnsentOutboundP2PMessages,
  getRelatedMessages: commCoreModule.getRelatedMessages,
  getOutboundP2PMessagesByID: commCoreModule.getOutboundP2PMessagesByID,
  searchMessages: commCoreModule.searchMessages,
  fetchMessages: commCoreModule.fetchMessages,

  // write operations
  removeInboundP2PMessages: commCoreModule.removeInboundP2PMessages,
  markOutboundP2PMessageAsSent: commCoreModule.markOutboundP2PMessageAsSent,
  resetOutboundP2PMessagesForDevice:
    commCoreModule.resetOutboundP2PMessagesForDevice,
  removeOutboundP2PMessage: commCoreModule.removeOutboundP2PMessage,

  async processDBStoreOperations(
    storeOperations: StoreOperations,
  ): Promise<void> {
    const keyserversToRemoveFromNotifsStore =
      getKeyserversToRemoveFromNotifsStore(
        storeOperations.keyserverStoreOperations ?? [],
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

      const dbOps =
        convertStoreOperationsToClientDBStoreOperations(storeOperations);
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
  },
};

export { sqliteAPI };
