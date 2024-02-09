// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useSelector } from 'lib/utils/redux-utils.js';

import { commCoreModule } from '../native-modules.js';

// Time after which rotation is started
const PREKEY_ROTATION_TIMEOUT = 3 * 1000; // in milliseconds

function PrekeysHandler(): null {
  const loggedIn = useSelector(isLoggedIn);

  React.useEffect(() => {
    if (!loggedIn) {
      return undefined;
    }

    const timeoutID = setTimeout(async () => {
      const authMetadata = await commCoreModule.getCommServicesAuthMetadata();
      const { userID, deviceID, accessToken } = authMetadata;
      if (!userID || !deviceID || !accessToken) {
        return;
      }

      try {
        await commCoreModule.initializeCryptoAccount();
        await commCoreModule.validateAndUploadPrekeys(
          userID,
          deviceID,
          accessToken,
        );
      } catch (e) {
        console.log('Prekey validation error: ', e.message);
      }
    }, PREKEY_ROTATION_TIMEOUT);

    return () => clearTimeout(timeoutID);
  }, [loggedIn]);

  return null;
}

export default PrekeysHandler;
