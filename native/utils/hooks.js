// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

import { useLogOut, logOutActionTypes } from 'lib/actions/user-actions.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { useSelector } from '../redux/redux-utils.js';
import { appOutOfDateAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

function useOnFirstLaunchEffect(uniqueKey: string, effect: () => mixed) {
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      if (started) {
        return;
      }
      setStarted(true);
      const hasBeenExecuted = await AsyncStorage.getItem(uniqueKey);
      if (hasBeenExecuted) {
        return;
      }

      try {
        await effect();
      } finally {
        await AsyncStorage.setItem(uniqueKey, 'true');
      }
    })();
  }, [effect, started, uniqueKey]);
}

function useShowVersionUnsupportedAlert(shouldCallLogOut: boolean): () => void {
  const loggedIn = useSelector(isLoggedIn);
  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();

  const onUsernameAlertAcknowledged = React.useCallback(() => {
    if (loggedIn && shouldCallLogOut) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [callLogOut, dispatchActionPromise, loggedIn, shouldCallLogOut]);

  return React.useCallback(() => {
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
  }, [onUsernameAlertAcknowledged]);
}

export { useOnFirstLaunchEffect, useShowVersionUnsupportedAlert };
