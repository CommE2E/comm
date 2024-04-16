// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import { MediaCacheContext } from 'lib/components/media-cache-provider.react.js';
import type { CallKeyserverEndpoint } from 'lib/keyserver-conn/keyserver-conn-types.js';
import { useKeyserverRecoveryLogIn } from 'lib/keyserver-conn/recovery-utils.js';
import { auxUserStoreOpsHandlers } from 'lib/ops/aux-user-store-ops.js';
import { communityStoreOpsHandlers } from 'lib/ops/community-store-ops.js';
import { integrityStoreOpsHandlers } from 'lib/ops/integrity-store-ops.js';
import { keyserverStoreOpsHandlers } from 'lib/ops/keyserver-store-ops.js';
import { reportStoreOpsHandlers } from 'lib/ops/report-store-ops.js';
import { syncedMetadataStoreOpsHandlers } from 'lib/ops/synced-metadata-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import { userStoreOpsHandlers } from 'lib/ops/user-store-ops.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useInitialNotificationsEncryptedMessage } from 'lib/shared/crypto-utils.js';
import { shouldClearData } from 'lib/shared/data-utils.js';
import {
  recoveryActionSources,
  type RecoveryActionSource,
} from 'lib/types/account-types.js';
import type { CallSingleKeyserverEndpoint } from 'lib/utils/call-single-keyserver-endpoint.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { supportingMultipleKeyservers } from 'lib/utils/services-utils.js';

import { resolveKeyserverSessionInvalidationUsingNativeCredentials } from '../account/legacy-recover-keyserver-session.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import { filesystemMediaCache } from '../media/media-cache.js';
import { commCoreModule } from '../native-modules.js';
import { setStoreLoadedActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import Alert from '../utils/alert.js';
import { isTaskCancelledError } from '../utils/error-handling.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

async function clearSensitiveData() {
  await commCoreModule.clearSensitiveData();
  try {
    await filesystemMediaCache.clearCache();
  } catch {
    throw new Error('clear_media_cache_failed');
  }
}

const returnsFalseSinceDoesntNeedToSupportCancellation = () => false;

function SQLiteDataHandler(): React.Node {
  const storeLoaded = useSelector(state => state.storeLoaded);

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();

  const rehydrateConcluded = useSelector(
    state => !!(state._persist && state._persist.rehydrated),
  );
  const staffCanSee = useStaffCanSee();
  const loggedIn = useSelector(isLoggedIn);
  const currentLoggedInUserID = useSelector(state =>
    state.currentUserInfo?.anonymous ? undefined : state.currentUserInfo?.id,
  );
  const mediaCacheContext = React.useContext(MediaCacheContext);
  const getInitialNotificationsEncryptedMessage =
    useInitialNotificationsEncryptedMessage(authoritativeKeyserverID);

  const keyserverRecoveryLogIn = useKeyserverRecoveryLogIn(
    authoritativeKeyserverID,
  );
  const recoverDataFromAuthoritativeKeyserver = React.useCallback(
    async (source: RecoveryActionSource) => {
      const innerRecoverDataFromAuthoritativeKeyserver = (
        callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
        callKeyserverEndpoint: CallKeyserverEndpoint,
      ) =>
        resolveKeyserverSessionInvalidationUsingNativeCredentials(
          callSingleKeyserverEndpoint,
          callKeyserverEndpoint,
          dispatchActionPromise,
          source,
          authoritativeKeyserverID,
          getInitialNotificationsEncryptedMessage,
          returnsFalseSinceDoesntNeedToSupportCancellation,
        );
      try {
        await keyserverRecoveryLogIn(
          source,
          innerRecoverDataFromAuthoritativeKeyserver,
          returnsFalseSinceDoesntNeedToSupportCancellation,
        );
        dispatch({ type: setStoreLoadedActionType });
      } catch (fetchCookieException) {
        if (staffCanSee) {
          Alert.alert(
            `Error fetching new cookie from native credentials: ${
              getMessageForException(fetchCookieException) ??
              '{no exception message}'
            }. Please kill the app.`,
          );
        } else {
          commCoreModule.terminate();
        }
      }
    },
    [
      dispatch,
      dispatchActionPromise,
      keyserverRecoveryLogIn,
      staffCanSee,
      getInitialNotificationsEncryptedMessage,
    ],
  );

  const recoverData = React.useCallback(
    (source: RecoveryActionSource) => {
      if (supportingMultipleKeyservers) {
        invariant(
          false,
          'recoverData in SQLiteDataHandler is not yet implemented when ' +
            'supportingMultipleKeyservers is enabled. It should recover ' +
            'from broken SQLite state by restoring from backup service',
        );
      }
      return recoverDataFromAuthoritativeKeyserver(source);
    },
    [recoverDataFromAuthoritativeKeyserver],
  );

  const callClearSensitiveData = React.useCallback(
    async (triggeredBy: string) => {
      await clearSensitiveData();
      console.log(`SQLite database deletion was triggered by ${triggeredBy}`);
    },
    [],
  );

  const handleSensitiveData = React.useCallback(async () => {
    try {
      const sqliteStampedUserID =
        await commCoreModule.getSQLiteStampedUserID();
      if (shouldClearData(sqliteStampedUserID, currentLoggedInUserID)) {
        await callClearSensitiveData('change in logged-in user credentials');
      }
      if (currentLoggedInUserID) {
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
        await recoverData(recoveryActionSources.corruptedDatabaseDeletion);
      })();
      return;
    }

    const sensitiveDataHandled = handleSensitiveData();
    if (storeLoaded) {
      return;
    }
    if (!loggedIn) {
      dispatch({ type: setStoreLoadedActionType });
      return;
    }
    void (async () => {
      await Promise.all([
        sensitiveDataHandled,
        mediaCacheContext?.evictCache(),
      ]);
      try {
        const {
          threads,
          messages,
          drafts,
          messageStoreThreads,
          reports,
          users,
          keyservers,
          communities,
          integrityThreadHashes,
          syncedMetadata,
          auxUserInfos,
        } = await commCoreModule.getClientDBStore();
        const threadInfosFromDB =
          threadStoreOpsHandlers.translateClientDBData(threads);
        const reportsFromDB =
          reportStoreOpsHandlers.translateClientDBData(reports);
        const usersFromDB = userStoreOpsHandlers.translateClientDBData(users);
        const keyserverInfosFromDB =
          keyserverStoreOpsHandlers.translateClientDBData(keyservers);
        const communityInfosFromDB =
          communityStoreOpsHandlers.translateClientDBData(communities);
        const threadHashesFromDB =
          integrityStoreOpsHandlers.translateClientDBData(
            integrityThreadHashes,
          );
        const syncedMetadataFromDB =
          syncedMetadataStoreOpsHandlers.translateClientDBData(syncedMetadata);
        const auxUserInfosFromDB =
          auxUserStoreOpsHandlers.translateClientDBData(auxUserInfos);

        dispatch({
          type: setClientDBStoreActionType,
          payload: {
            drafts,
            messages,
            threadStore: { threadInfos: threadInfosFromDB },
            currentUserID: currentLoggedInUserID,
            messageStoreThreads,
            reports: reportsFromDB,
            users: usersFromDB,
            keyserverInfos: keyserverInfosFromDB,
            communities: communityInfosFromDB,
            threadHashes: threadHashesFromDB,
            syncedMetadata: syncedMetadataFromDB,
            auxUserInfos: auxUserInfosFromDB,
          },
        });
      } catch (setStoreException) {
        if (isTaskCancelledError(setStoreException)) {
          dispatch({ type: setStoreLoadedActionType });
          return;
        }
        if (staffCanSee) {
          Alert.alert(
            'Error setting threadStore or messageStore',
            getMessageForException(setStoreException) ??
              '{no exception message}',
          );
        }
        await recoverData(recoveryActionSources.sqliteLoadFailure);
      }
    })();
  }, [
    currentLoggedInUserID,
    handleSensitiveData,
    loggedIn,
    dispatch,
    rehydrateConcluded,
    staffCanSee,
    storeLoaded,
    recoverData,
    callClearSensitiveData,
    mediaCacheContext,
  ]);

  return null;
}

export { SQLiteDataHandler, clearSensitiveData };
