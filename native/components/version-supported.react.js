// @flow

import * as React from 'react';

import { useLogOut, logOutActionTypes } from 'lib/actions/user-actions.js';
import { preRequestUserStateForSingleKeyserverSelector } from 'lib/selectors/account-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useDispatchActionPromise } from 'lib/utils/action-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import { commRustModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { AppOutOfDateAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

function VersionSupportedChecker(): React.Node {
  const hasRun = React.useRef(false);

  const loggedIn = useSelector(isLoggedIn);
  const preRequestUserState = useSelector(
    preRequestUserStateForSingleKeyserverSelector(ashoatKeyserverID),
  );
  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();

  const onUsernameAlertAcknowledged = React.useCallback(() => {
    if (loggedIn) {
      dispatchActionPromise(logOutActionTypes, callLogOut(preRequestUserState));
    }
  }, [callLogOut, dispatchActionPromise, loggedIn, preRequestUserState]);

  const checkVersionSupport = React.useCallback(async () => {
    try {
      const isVersionSupported = await commRustModule.versionSupported();
      if (isVersionSupported) {
        return;
      }
      Alert.alert(
        AppOutOfDateAlertDetails.title,
        AppOutOfDateAlertDetails.message,
        [
          {
            text: 'OK',
            onPress: onUsernameAlertAcknowledged,
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      console.error('Error checking version:', error);
    }
  }, [onUsernameAlertAcknowledged]);

  React.useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    checkVersionSupport();
  }, [checkVersionSupport]);

  return null;
}

export default VersionSupportedChecker;
