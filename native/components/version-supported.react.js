// @flow

import * as React from 'react';

import { useLogOut, logOutActionTypes } from 'lib/actions/user-actions.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { commRustModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { appOutOfDateAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

function VersionSupportedChecker(): React.Node {
  const hasRun = React.useRef(false);

  const loggedIn = useSelector(isLoggedIn);
  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();

  const onUsernameAlertAcknowledged = React.useCallback(() => {
    if (loggedIn) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [callLogOut, dispatchActionPromise, loggedIn]);

  const checkVersionSupport = React.useCallback(async () => {
    try {
      const isVersionSupported = await commRustModule.versionSupported();
      if (isVersionSupported) {
        return;
      }
      Alert.alert(
        appOutOfDateAlertDetails.title,
        appOutOfDateAlertDetails.message,
        [
          {
            text: 'OK',
            onPress: onUsernameAlertAcknowledged,
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      console.log('Error checking version:', error);
    }
  }, [onUsernameAlertAcknowledged]);

  React.useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    void checkVersionSupport();
  }, [checkVersionSupport]);

  return null;
}

export default VersionSupportedChecker;
