// @flow

import * as React from 'react';
import { Alert } from 'react-native';
import ExitApp from 'react-native-exit-app';
import { useDispatch } from 'react-redux';

import { setMessageStoreMessages } from 'lib/actions/message-actions.js';
import { setThreadStoreActionType } from 'lib/actions/thread-actions';
import { isLoggedIn } from 'lib/selectors/user-selectors';
import { logInActionSources } from 'lib/types/account-types';
import { fetchNewCookieFromNativeCredentials } from 'lib/utils/action-utils';
import { getMessageForException } from 'lib/utils/errors';
import { convertClientDBThreadInfosToRawThreadInfos } from 'lib/utils/thread-ops-utils';

import { commCoreModule } from '../native-modules';
import { useSelector } from '../redux/redux-utils';
import { useStaffCanSee } from '../utils/staff-utils';
import { SQLiteContext } from './sqlite-context';

type Props = {
  +children: React.Node,
};

function SQLiteContextProvider(props: Props): React.Node {
  const [storeLoaded, setStoreLoaded] = React.useState<boolean>(false);

  const dispatch = useDispatch();
  const rehydrateConcluded = useSelector(
    state => !!(state._persist && state._persist.rehydrated),
  );
  const cookie = useSelector(state => state.cookie);
  const urlPrefix = useSelector(state => state.urlPrefix);
  const staffCanSee = useStaffCanSee();
  const loggedIn = useSelector(isLoggedIn);
  const currentLoggedInUserID = useSelector(state =>
    state.currentUserInfo?.anonymous ? undefined : state.currentUserInfo?.id,
  );

  const handleSensitiveData = React.useCallback(async () => {
    try {
      const databaseCurrentUserInfoID = await commCoreModule.getCurrentUserID();
      if (
        databaseCurrentUserInfoID &&
        databaseCurrentUserInfoID !== currentLoggedInUserID
      ) {
        await commCoreModule.clearSensitiveData();
      }
      if (currentLoggedInUserID) {
        await commCoreModule.setCurrentUserID(currentLoggedInUserID);
      }
      const databaseDeviceID = await commCoreModule.getDeviceID();
      if (!databaseDeviceID) {
        await commCoreModule.setDeviceID('MOBILE');
      }
    } catch (e) {
      if (__DEV__) {
        throw e;
      } else {
        console.log(e);
        ExitApp.exitApp();
      }
    }
  }, [currentLoggedInUserID]);

  React.useEffect(() => {
    if (!rehydrateConcluded) {
      return;
    }
    const sensitiveDataHandled = handleSensitiveData();
    if (storeLoaded) {
      return;
    }
    if (!loggedIn) {
      setStoreLoaded(true);
      return;
    }
    (async () => {
      await sensitiveDataHandled;
      try {
        const [threads, messages] = await Promise.all([
          commCoreModule.getAllThreads(),
          commCoreModule.getAllMessages(),
        ]);
        const threadInfosFromDB = convertClientDBThreadInfosToRawThreadInfos(
          threads,
        );
        dispatch({
          type: setThreadStoreActionType,
          payload: { threadInfos: threadInfosFromDB },
        });
        dispatch({
          type: setMessageStoreMessages,
          payload: messages,
        });
        setStoreLoaded(true);
      } catch (setStoreException) {
        if (staffCanSee) {
          Alert.alert(
            `Error setting threadStore or messageStore: ${
              getMessageForException(setStoreException) ??
              '{no exception message}'
            }`,
          );
        }
        try {
          await fetchNewCookieFromNativeCredentials(
            dispatch,
            cookie,
            urlPrefix,
            logInActionSources.sqliteLoadFailure,
          );
          setStoreLoaded(true);
        } catch (fetchCookieException) {
          if (staffCanSee) {
            Alert.alert(
              `Error fetching new cookie from native credentials: ${
                getMessageForException(fetchCookieException) ??
                '{no exception message}'
              }. Please kill the app.`,
            );
          } else {
            ExitApp.exitApp();
          }
        }
      }
    })();
  }, [
    handleSensitiveData,
    loggedIn,
    cookie,
    dispatch,
    rehydrateConcluded,
    staffCanSee,
    storeLoaded,
    urlPrefix,
  ]);

  const contextValue = React.useMemo(
    () => ({
      storeLoaded,
    }),
    [storeLoaded],
  );

  return (
    <SQLiteContext.Provider value={contextValue}>
      {props.children}
    </SQLiteContext.Provider>
  );
}

export { SQLiteContextProvider };
