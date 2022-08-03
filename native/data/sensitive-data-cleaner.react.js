// @flow

import * as React from 'react';
import ExitApp from 'react-native-exit-app';

import { useSelector } from '../redux/redux-utils';

function SensitiveDataCleaner(): null {
  const currentUserInfo = useSelector(state => state.currentUserInfo);

  React.useEffect(() => {
    if (currentUserInfo && currentUserInfo.anonymous) {
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
    }
  }, [currentUserInfo]);
  return null;
}

export { SensitiveDataCleaner };
