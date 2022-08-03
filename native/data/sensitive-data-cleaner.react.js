// @flow

import * as React from 'react';
import ExitApp from 'react-native-exit-app';

import { useSelector } from '../redux/redux-utils';

function SensitiveDataCleaner(): null {
  const userIsLoggedIn = useSelector(state =>
    state.currentUserInfo && !state.currentUserInfo.anonymous ? true : false,
  );
  React.useEffect(() => {
    if (userIsLoggedIn) {
      return;
    }
    try {
      global.CommCoreModule.clearSensitiveData();
    } catch (e) {
      if (__DEV__) {
        throw e;
      } else {
        console.log(e.message);
        ExitApp.exitApp();
      }
    }
  }, [userIsLoggedIn]);
  return null;
}

export { SensitiveDataCleaner };
