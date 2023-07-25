// @flow

import localforage from 'localforage';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import { reportStoreOpsHandlers } from 'lib/ops/report-store-ops.js';

import { databaseModule } from './database-module-provider.js';
import { SQLITE_ENCRYPTION_KEY } from './utils/constants.js';
import { isDesktopSafari } from './utils/db-utils.js';
import {
  exportKeyToJWK,
  generateDatabaseCryptoKey,
} from './utils/worker-crypto-utils.js';
import { useSelector } from '../redux/redux-utils.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

async function getSafariEncryptionKey(): Promise<SubtleCrypto$JsonWebKey> {
  const encryptionKey = await localforage.getItem(SQLITE_ENCRYPTION_KEY);
  if (encryptionKey) {
    return await exportKeyToJWK(encryptionKey);
  }
  const newEncryptionKey = await generateDatabaseCryptoKey({
    extractable: true,
  });
  await localforage.setItem(SQLITE_ENCRYPTION_KEY, newEncryptionKey);
  return await exportKeyToJWK(newEncryptionKey);
}

function SQLiteDataHandler(): React.Node {
  const dispatch = useDispatch();
  const rehydrateConcluded = useSelector(
    state => !!(state._persist && state._persist.rehydrated),
  );
  const currentLoggedInUserID = useSelector(state =>
    state.currentUserInfo?.anonymous ? undefined : state.currentUserInfo?.id,
  );

  const handleSensitiveData = React.useCallback(async () => {
    try {
      const currentUserData = await databaseModule.schedule({
        type: workerRequestMessageTypes.GET_CURRENT_USER_ID,
      });
      const currentDBUserID = currentUserData?.userID;

      if (currentDBUserID && currentDBUserID !== currentLoggedInUserID) {
        await databaseModule.clearSensitiveData();
      }
      if (
        currentLoggedInUserID &&
        (currentDBUserID || currentDBUserID !== currentLoggedInUserID)
      ) {
        await databaseModule.schedule({
          type: workerRequestMessageTypes.SET_CURRENT_USER_ID,
          userID: currentLoggedInUserID,
        });
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, [currentLoggedInUserID]);

  React.useEffect(() => {
    (async () => {
      if (currentLoggedInUserID) {
        let databaseEncryptionKeyJWK = null;
        if (isDesktopSafari) {
          databaseEncryptionKeyJWK = await getSafariEncryptionKey();
        }
        await databaseModule.initDBForLoggedInUser(
          currentLoggedInUserID,
          databaseEncryptionKeyJWK,
        );
      }

      if (!rehydrateConcluded) {
        return;
      }

      const isSupported = await databaseModule.isDatabaseSupported();
      if (!isSupported) {
        return;
      }
      await handleSensitiveData();
      if (!currentLoggedInUserID) {
        return;
      }
      const data = await databaseModule.schedule({
        type: workerRequestMessageTypes.GET_CLIENT_STORE,
      });

      if (!data?.store?.drafts && !data?.store?.reports) {
        return;
      }
      const reports = reportStoreOpsHandlers.translateClientDBData(
        data.store.reports,
      );
      dispatch({
        type: setClientDBStoreActionType,
        payload: {
          drafts: data.store.drafts,
          reports,
        },
      });
    })();
  }, [
    currentLoggedInUserID,
    dispatch,
    handleSensitiveData,
    rehydrateConcluded,
  ]);

  return null;
}

export { SQLiteDataHandler };
