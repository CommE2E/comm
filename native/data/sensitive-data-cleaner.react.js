// @flow

import * as React from 'react';
import ExitApp from 'react-native-exit-app';

import { useSelector } from '../redux/redux-utils';

function SensitiveDataCleaner(): null {
  const currentLoggedInUserID = useSelector(state =>
    state.currentUserInfo?.anonymous ? null : state.currentUserInfo?.id,
  );
  React.useEffect(() => {
    try {
      const databaseCurrentUserInfoID = global.CommCoreModule.getCurrentUserID();
      if (
        databaseCurrentUserInfoID &&
        databaseCurrentUserInfoID !== currentLoggedInUserID
      ) {
        global.CommCoreModule.clearSensitiveData();
      } else if (currentLoggedInUserID && !databaseCurrentUserInfoID) {
        global.CommCoreModule.setCurrentUserID(currentLoggedInUserID);
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
  return null;
}

export { SensitiveDataCleaner };
