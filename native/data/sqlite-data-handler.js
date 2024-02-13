// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import { MediaCacheContext } from 'lib/components/media-cache-provider.react.js';
import { useStaffContext } from 'lib/components/staff-provider.react.js';
import type { CallKeyserverEndpoint } from 'lib/keyserver-conn/keyserver-conn-types.js';
import { resolveKeyserverSessionInvalidation } from 'lib/keyserver-conn/recovery-utils.js';
import { communityStoreOpsHandlers } from 'lib/ops/community-store-ops.js';
import { keyserverStoreOpsHandlers } from 'lib/ops/keyserver-store-ops.js';
import { reportStoreOpsHandlers } from 'lib/ops/report-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import { userStoreOpsHandlers } from 'lib/ops/user-store-ops.js';
import {
  cookieSelector,
  urlPrefixSelector,
} from 'lib/selectors/keyserver-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useInitialNotificationsEncryptedMessage } from 'lib/shared/crypto-utils.js';
import {
  recoveryActionSources,
  type RecoveryActionSource,
} from 'lib/types/account-types.js';
import type { CallSingleKeyserverEndpoint } from 'lib/utils/call-single-keyserver-endpoint.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

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

function SQLiteDataHandler(): React.Node {
  const storeLoaded = useSelector(state => state.storeLoaded);

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();

  const rehydrateConcluded = useSelector(
    state => !!(state._persist && state._persist.rehydrated),
  );
  const cookie = useSelector(cookieSelector(authoritativeKeyserverID));
  const urlPrefix = useSelector(urlPrefixSelector(authoritativeKeyserverID));
  invariant(urlPrefix, "missing urlPrefix for ashoat's keyserver");
  const staffCanSee = useStaffCanSee();
  const { staffUserHasBeenLoggedIn } = useStaffContext();
  const loggedIn = useSelector(isLoggedIn);
  const currentLoggedInUserID = useSelector(state =>
    state.currentUserInfo?.anonymous ? undefined : state.currentUserInfo?.id,
  );
  const mediaCacheContext = React.useContext(MediaCacheContext);
  const getInitialNotificationsEncryptedMessage =
    useInitialNotificationsEncryptedMessage(authoritativeKeyserverID);

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
          () => false,
        );
      try {
        await resolveKeyserverSessionInvalidation(
          dispatch,
          cookie,
          urlPrefix,
          source,
          authoritativeKeyserverID,
          innerRecoverDataFromAuthoritativeKeyserver,
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
      cookie,
      dispatch,
      dispatchActionPromise,
      staffCanSee,
      urlPrefix,
      getInitialNotificationsEncryptedMessage,
    ],
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
      const databaseCurrentUserInfoID = await commCoreModule.getCurrentUserID();
      if (
        databaseCurrentUserInfoID &&
        databaseCurrentUserInfoID !== currentLoggedInUserID
      ) {
        await callClearSensitiveData('change in logged-in user credentials');
      }
      if (currentLoggedInUserID) {
        await commCoreModule.setCurrentUserID(currentLoggedInUserID);
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
        await recoverDataFromAuthoritativeKeyserver(
          recoveryActionSources.corruptedDatabaseDeletion,
        );
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
        await recoverDataFromAuthoritativeKeyserver(
          recoveryActionSources.sqliteLoadFailure,
        );
      }
    })();
  }, [
    currentLoggedInUserID,
    handleSensitiveData,
    loggedIn,
    cookie,
    dispatch,
    rehydrateConcluded,
    staffCanSee,
    storeLoaded,
    urlPrefix,
    staffUserHasBeenLoggedIn,
    recoverDataFromAuthoritativeKeyserver,
    callClearSensitiveData,
    mediaCacheContext,
  ]);

  return null;
}

export { SQLiteDataHandler, clearSensitiveData };
