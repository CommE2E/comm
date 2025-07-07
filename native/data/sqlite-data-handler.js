// @flow

import * as React from 'react';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import { MediaCacheContext } from 'lib/components/media-cache-provider.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { shouldClearData } from 'lib/shared/data-utils.js';
import { databaseIdentifier } from 'lib/types/database-identifier-types.js';
import { getConfig } from 'lib/utils/config.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import {
  reportDatabaseDeleted,
  databaseResetStatus,
  setDatabaseResetStatus,
} from 'lib/utils/wait-until-db-deleted.js';

import { filesystemMediaCache } from '../media/media-cache.js';
import { commCoreModule } from '../native-modules.js';
import { setStoreLoadedActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import Alert from '../utils/alert.js';
import { isTaskCancelledError } from '../utils/error-handling.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

async function clearSensitiveData() {
  try {
    setDatabaseResetStatus(databaseResetStatus.RESET_IN_PROGRESS);
    await commCoreModule.clearSensitiveData();
    setDatabaseResetStatus(databaseResetStatus.READY);
    reportDatabaseDeleted();
  } catch (error) {
    console.log(
      `Error clearing SQLite database: ${
        getMessageForException(error) ?? 'unknown'
      }`,
    );
    throw error;
  }
  try {
    await filesystemMediaCache.clearCache();
  } catch {
    throw new Error('clear_media_cache_failed');
  }
}

function SQLiteDataHandler(): React.Node {
  const initialStateLoaded = useSelector(state => state.initialStateLoaded);

  const dispatch = useDispatch();

  const rehydrateConcluded = useSelector(
    state => !!(state._persist && state._persist.rehydrated),
  );
  const staffCanSee = useStaffCanSee();
  const loggedIn = useSelector(isLoggedIn);
  const currentLoggedInUserID = useSelector(state =>
    state.currentUserInfo?.anonymous ? undefined : state.currentUserInfo?.id,
  );
  const mediaCacheContext = React.useContext(MediaCacheContext);

  const showCorruptionAlert = React.useCallback(() => {
    const { showAlert } = getConfig();
    showAlert(
      'Corrupted data',
      'Comm failed to load your local data. Please log in again.',
    );
  }, []);

  const callClearSensitiveData = React.useCallback(
    async (triggeredBy: string) => {
      await clearSensitiveData();
      const { showAlert, isStaffRelease } = getConfig();
      if (isStaffRelease) {
        showAlert('SQLite database deletion', `triggered by ${triggeredBy}`);
      }
      console.log(`SQLite database deletion was triggered by ${triggeredBy}`);
    },
    [],
  );

  const handleSensitiveData = React.useCallback(async () => {
    try {
      let sqliteStampedUserID,
        errorGettingStampedUserID = false;
      try {
        sqliteStampedUserID = await commCoreModule.getSQLiteStampedUserID();
      } catch (error) {
        errorGettingStampedUserID = true;
        console.log(
          `Error getting SQLite stamped user ID: ${
            getMessageForException(error) ?? 'unknown'
          }`,
        );
      }
      if (
        errorGettingStampedUserID ||
        shouldClearData(sqliteStampedUserID, currentLoggedInUserID)
      ) {
        await callClearSensitiveData('change in logged-in user credentials');
      }
      if (
        currentLoggedInUserID &&
        currentLoggedInUserID !== sqliteStampedUserID
      ) {
        await commCoreModule.stampSQLiteDBUserID(currentLoggedInUserID);
      }
    } catch (e) {
      if (isTaskCancelledError(e)) {
        return;
      }
      if (__DEV__) {
        throw e;
      }
      console.log(e);
      if (e.message !== 'clear_media_cache_failed') {
        commCoreModule.terminate();
      }
    }
  }, [callClearSensitiveData, currentLoggedInUserID]);

  const isRunning = React.useRef(false);
  React.useEffect(() => {
    if (!rehydrateConcluded) {
      return;
    }

    const databaseNeedsDeletion = commCoreModule.checkIfDatabaseNeedsDeletion();
    if (databaseNeedsDeletion) {
      void (async () => {
        try {
          await callClearSensitiveData('detecting corrupted database');
        } catch (e) {
          if (__DEV__) {
            throw e;
          }
          console.log(e);
          if (e.message !== 'clear_media_cache_failed') {
            commCoreModule.terminate();
          }
        }
        showCorruptionAlert();
      })();
      return;
    }

    const sensitiveDataHandled = handleSensitiveData();
    if (initialStateLoaded) {
      return;
    }
    if (!loggedIn) {
      dispatch({ type: setStoreLoadedActionType });
      return;
    }
    if (isRunning.current) {
      return;
    }
    isRunning.current = true;
    void (async () => {
      try {
        await Promise.all([
          sensitiveDataHandled,
          mediaCacheContext?.evictCache(),
        ]);
      } finally {
        isRunning.current = false;
      }
      try {
        const { sqliteAPI } = getConfig();
        const clientDBStore = await sqliteAPI.getClientDBStore(
          databaseIdentifier.MAIN,
          currentLoggedInUserID,
        );
        dispatch({
          type: setClientDBStoreActionType,
          payload: clientDBStore,
        });
      } catch (setStoreException) {
        if (isTaskCancelledError(setStoreException)) {
          dispatch({ type: setStoreLoadedActionType });
          return;
        }
        if (staffCanSee) {
          Alert.alert(
            'Error setting clientDBStore',
            getMessageForException(setStoreException) ??
              '{no exception message}',
          );
        } else {
          showCorruptionAlert();
        }
      } finally {
        isRunning.current = false;
      }
    })();
  }, [
    currentLoggedInUserID,
    handleSensitiveData,
    loggedIn,
    dispatch,
    rehydrateConcluded,
    staffCanSee,
    initialStateLoaded,
    showCorruptionAlert,
    callClearSensitiveData,
    mediaCacheContext,
  ]);

  return null;
}

export { SQLiteDataHandler, clearSensitiveData };
