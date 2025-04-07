// @flow

import * as React from 'react';

import { shouldClearData } from 'lib/shared/data-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import {
  reportDatabaseDeleted,
  databaseResetStatus,
  setDatabaseResetStatus,
} from 'lib/utils/wait-until-db-deleted.js';

import { getCommSharedWorker } from './shared-worker-provider.js';
import { useSelector } from '../redux/redux-utils.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

function SQLiteDataHandler(): React.Node {
  const dispatch = useDispatch();
  const rehydrateConcluded = useSelector(
    state => !!(state._persist && state._persist.rehydrated),
  );
  const currentLoggedInUserID = useSelector(state =>
    state.currentUserInfo?.anonymous ? undefined : state.currentUserInfo?.id,
  );

  const handleSensitiveData = React.useCallback(async () => {
    const sharedWorker = await getCommSharedWorker();
    let sqliteStampedUserID,
      errorGettingStampedUserID = false;
    try {
      const currentUserData = await sharedWorker.schedule({
        type: workerRequestMessageTypes.GET_SQLITE_STAMPED_USER_ID,
      });
      sqliteStampedUserID = currentUserData?.userID;
    } catch (error) {
      errorGettingStampedUserID = true;
      console.error(
        `Error getting SQLite stamped user ID: ${
          getMessageForException(error) ?? 'unknown'
        }`,
      );
    }

    if (
      errorGettingStampedUserID ||
      shouldClearData(sqliteStampedUserID, currentLoggedInUserID)
    ) {
      try {
        setDatabaseResetStatus(databaseResetStatus.resetInProgress);
        await sharedWorker.init({ clearDatabase: true });
        setDatabaseResetStatus(databaseResetStatus.ready);
        reportDatabaseDeleted();
      } catch (error) {
        console.error(
          `Error clearing sensitive data: ${
            getMessageForException(error) ?? 'unknown'
          }`,
        );
        // We return here to avoid assigning new user to old data
        return;
      }
    }

    if (
      currentLoggedInUserID &&
      currentLoggedInUserID !== sqliteStampedUserID
    ) {
      try {
        await sharedWorker.schedule({
          type: workerRequestMessageTypes.STAMP_SQLITE_DB_USER_ID,
          userID: currentLoggedInUserID,
        });
      } catch (error) {
        console.error(
          `Error stamping SQLite database with user ID: ${
            getMessageForException(error) ?? 'unknown'
          }`,
        );
      }
    }
  }, [currentLoggedInUserID]);

  React.useEffect(() => {
    void (async () => {
      const sharedWorker = await getCommSharedWorker();

      if (!rehydrateConcluded) {
        return;
      }

      const isSupported = await sharedWorker.isSupported();
      if (!isSupported) {
        return;
      }
      await handleSensitiveData();
    })();
  }, [dispatch, handleSensitiveData, rehydrateConcluded]);

  return null;
}

export { SQLiteDataHandler };
