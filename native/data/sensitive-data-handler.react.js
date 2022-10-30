// @flow

import * as React from 'react';
import ExitApp from 'react-native-exit-app';

import { commCoreModule } from '../native-modules';
import { useSelector } from '../redux/redux-utils';

function SensitiveDataHandler(): null {
  const currentLoggedInUserID: ?string = useSelector(state =>
    state.currentUserInfo?.anonymous ? undefined : state.currentUserInfo?.id,
  );
  React.useEffect(() => {
    (async () => {
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
    })();
  }, [currentLoggedInUserID]);
  return null;
}

export { SensitiveDataHandler };
