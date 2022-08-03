// @flow

import * as React from 'react';
import ExitApp from 'react-native-exit-app';

import { useSelector } from '../redux/redux-utils';

function SensitiveDataCleaner(): null {
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  React.useEffect(() => {
    try {
      const databaseCurrentUserInfoID = global.CommCoreModule.getCurrentUserID();
      const userLoggedOut =
        !currentUserInfo || currentUserInfo.anonymous ? true : false;
      if (
        databaseCurrentUserInfoID &&
        (userLoggedOut || currentUserInfo?.id !== databaseCurrentUserInfoID)
      ) {
        global.CommCoreModule.clearSensitiveData();
      } else if (!userLoggedOut && !databaseCurrentUserInfoID) {
        global.CommCoreModule.setCurrentUserID(currentUserInfo?.id);
      }
    } catch (e) {
      if (__DEV__) {
        throw e;
      } else {
        console.log(e);
        ExitApp.exitApp();
      }
    }
  }, [currentUserInfo]);
  return null;
}

export { SensitiveDataCleaner };
