// @flow

import { holderStoreOpsHandlers } from 'lib/ops/holder-store-ops.js';
import { getKeyserversToRemoveFromNotifsStore } from 'lib/ops/keyserver-store-ops.js';
import { convertStoreOperationsToClientDBStoreOperations } from 'lib/shared/redux/client-db-utils.js';
import type { DatabaseIdentifier } from 'lib/types/database-identifier-types';
import type { StoredHolders } from 'lib/types/holder-types';
import type { SQLiteAPI } from 'lib/types/sqlite-types.js';
import type { StoreOperations } from 'lib/types/store-ops-types';
import type { QRAuthBackupData } from 'lib/types/tunnelbroker/qr-code-auth-message-types.js';
import { values } from 'lib/utils/objects.js';

import { getClientDBStore } from './store.js';
import { commCoreModule } from '../native-modules.js';
import { storeVersion } from '../redux/persist-constants.js';
import { isTaskCancelledError } from '../utils/error-handling.js';

const sqliteAPI: SQLiteAPI = {
  // read operations
  getAllInboundP2PMessages: commCoreModule.getAllInboundP2PMessages,
  getInboundP2PMessagesByID: commCoreModule.getInboundP2PMessagesByID,
  getUnsentOutboundP2PMessages: commCoreModule.getUnsentOutboundP2PMessages,
  getRelatedMessages: commCoreModule.getRelatedMessages,
  getOutboundP2PMessagesByID: commCoreModule.getOutboundP2PMessagesByID,
  searchMessages: commCoreModule.searchMessages,
  fetchMessages: commCoreModule.fetchMessages,
  fetchDMOperationsByType: commCoreModule.getDMOperationsByType,
  getClientDBStore,
  getDatabaseVersion: commCoreModule.getDatabaseVersion,
  getSyncedMetadata: commCoreModule.getSyncedMetadata,

  async getHolders(dbID: DatabaseIdentifier): Promise<StoredHolders> {
    const dbHolders = await commCoreModule.getHolders(dbID);
    return holderStoreOpsHandlers.translateClientDBData(dbHolders);
  },
  async getAuxUserIDs(dbID: DatabaseIdentifier): Promise<Array<string>> {
    const auxUserInfos = await commCoreModule.getAuxUserInfos(dbID);
    return auxUserInfos.map(auxUserInfo => auxUserInfo.id);
  },

  // write operations
  removeInboundP2PMessages: commCoreModule.removeInboundP2PMessages,
  markOutboundP2PMessageAsSent: commCoreModule.markOutboundP2PMessageAsSent,
  resetOutboundP2PMessagesForDevice:
    commCoreModule.resetOutboundP2PMessagesForDevice,
  removeOutboundP2PMessage: commCoreModule.removeOutboundP2PMessage,

  async processDBStoreOperations(
    storeOperations: StoreOperations,
    dbID: DatabaseIdentifier,
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
        promises.push(commCoreModule.processDBStoreOperations(dbOps, dbID));
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

  //backup
  async restoreUserData(qrAuthBackupData: QRAuthBackupData): Promise<void> {
    const { backupID, backupDataKey, backupLogDataKey } = qrAuthBackupData;
    return commCoreModule.restoreBackupData(
      backupID,
      backupDataKey,
      backupLogDataKey,
      storeVersion.toString(),
    );
  },
  migrateBackupSchema: commCoreModule.migrateBackupSchema,
  copyContentFromBackupDatabase: commCoreModule.copyContentFromBackupDatabase,
};

export { sqliteAPI };
