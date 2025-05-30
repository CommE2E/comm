// @flow

import * as React from 'react';

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { databaseIdentifier } from '../types/database-identifier-types.js';
import type { IdentityAuthResult } from '../types/identity-service-types.js';
import type { QRAuthBackupData } from '../types/tunnelbroker/qr-code-auth-message-types.js';
import { getConfig } from '../utils/config.js';
import { useDispatch } from '../utils/redux-utils.js';

function useUserDataRestore(): (
  backupData: QRAuthBackupData,
  identityAuthResult: IdentityAuthResult,
) => Promise<void> {
  const dispatch = useDispatch();

  return React.useCallback(
    async (
      backupData: QRAuthBackupData,
      identityAuthResult: IdentityAuthResult,
    ) => {
      const { sqliteAPI } = getConfig();

      await sqliteAPI.restoreUserData(backupData, identityAuthResult);
      await sqliteAPI.migrateBackupSchema();
      await sqliteAPI.copyContentFromBackupDatabase();
      const clientDBStore = await sqliteAPI.getClientDBStore(
        databaseIdentifier.MAIN,
        identityAuthResult.userID,
      );

      dispatch({
        type: setClientDBStoreActionType,
        payload: clientDBStore,
      });
    },
    [dispatch],
  );
}

export { useUserDataRestore };
