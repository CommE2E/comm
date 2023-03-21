// @flow

import * as React from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  logInActionSources,
  type LogInActionSource,
} from 'lib/types/account-types.js';
import { fetchNewCookieFromNativeCredentials } from 'lib/utils/action-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { convertClientDBThreadInfosToRawThreadInfos } from 'lib/utils/thread-ops-utils.js';

import { commCoreModule } from '../native-modules.js';
import { setStoreLoadedActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { StaffContext } from '../staff/staff-context.js';
import { isTaskCancelledError } from '../utils/error-handling.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

function SQLiteDataHandler(): React.Node {
  const storeLoaded = useSelector(state => state.storeLoaded);

  const dispatch = useDispatch();
  const rehydrateConcluded = useSelector(
    state => !!(state._persist && state._persist.rehydrated),
  );
  const cookie = useSelector(state => state.cookie);
  const urlPrefix = useSelector(state => state.urlPrefix);
  const staffCanSee = useStaffCanSee();
  const { staffUserHasBeenLoggedIn } = React.useContext(StaffContext);
  const loggedIn = useSelector(isLoggedIn);
  const currentLoggedInUserID = useSelector(state =>
    state.currentUserInfo?.anonymous ? undefined : state.currentUserInfo?.id,
  );

  const callFetchNewCookieFromNativeCredentials = React.useCallback(
    async (source: LogInActionSource) => {
      try {
        await fetchNewCookieFromNativeCredentials(
          dispatch,
          cookie,
          urlPrefix,
          source,
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
    [cookie, dispatch, staffCanSee, urlPrefix],
  );

  const callClearSensitiveData = React.useCallback(
    async (triggeredBy: string) => {
      if (staffCanSee || staffUserHasBeenLoggedIn) {
        Alert.alert('Starting SQLite database deletion process');
      }
      await commCoreModule.clearSensitiveData();
      if (staffCanSee || staffUserHasBeenLoggedIn) {
        Alert.alert(
          'SQLite database successfully deleted',
          `SQLite database deletion was triggered by ${triggeredBy}`,
        );
      }
      Alert.alert(new Date().toISOString());
      const foo = commCoreModule.get42();
      const bar = commCoreModule.get42();
      Alert.alert(new Date().toISOString());
      const x = await foo;
      Alert.alert(new Date().toISOString());
      if (x) {
        Alert.alert('Got back ' + x);
      }
      const y = await bar;
      Alert.alert(new Date().toISOString());
      if (y) {
        Alert.alert('Got back' + y);
      }
    },
    [staffCanSee, staffUserHasBeenLoggedIn],
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
      const databaseDeviceID = await commCoreModule.getDeviceID();
      if (!databaseDeviceID) {
        await commCoreModule.setDeviceID('MOBILE');
      }
    } catch (e) {
      if (isTaskCancelledError(e)) {
        return;
      }
      if (__DEV__) {
        throw e;
      } else {
        console.log(e);
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
      (async () => {
        try {
          await callClearSensitiveData('detecting corrupted database');
        } catch (e) {
          if (__DEV__) {
            throw e;
          } else {
            console.log(e);
            commCoreModule.terminate();
          }
        }
        await callFetchNewCookieFromNativeCredentials(
          logInActionSources.corruptedDatabaseDeletion,
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
    (async () => {
      await sensitiveDataHandled;
      try {
        const { threads, messages, drafts } =
          await commCoreModule.getClientDBStore();
        const threadInfosFromDB =
          convertClientDBThreadInfosToRawThreadInfos(threads);
        dispatch({
          type: setClientDBStoreActionType,
          payload: {
            drafts,
            messages,
            threadStore: { threadInfos: threadInfosFromDB },
            currentUserID: currentLoggedInUserID,
          },
        });
      } catch (setStoreException) {
        if (isTaskCancelledError(setStoreException)) {
          dispatch({ type: setStoreLoadedActionType });
          return;
        }
        if (staffCanSee) {
          Alert.alert(
            `Error setting threadStore or messageStore: ${
              getMessageForException(setStoreException) ??
              '{no exception message}'
            }`,
          );
        }
        await callFetchNewCookieFromNativeCredentials(
          logInActionSources.sqliteLoadFailure,
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
    callFetchNewCookieFromNativeCredentials,
    callClearSensitiveData,
  ]);

  return null;
}

export { SQLiteDataHandler };
