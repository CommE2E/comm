// @flow

import * as React from 'react';

import {
  setDeviceToken,
  setDeviceTokenActionTypes,
} from 'lib/actions/device-actions.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import electron from '../electron.js';
import { useSelector } from '../redux/redux-utils.js';

function useCreatePushSubscription(): () => Promise<void> {
  const publicKey = useSelector(state => state.pushApiPublicKey);

  const dispatchActionPromise = useDispatchActionPromise();
  const callSetDeviceToken = useServerCall(setDeviceToken);

  return React.useCallback(async () => {
    if (!publicKey) {
      return;
    }

    const workerRegistration = await navigator.serviceWorker?.ready;
    if (!workerRegistration) {
      return;
    }

    const subscription = await workerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });

    dispatchActionPromise(
      setDeviceTokenActionTypes,
      callSetDeviceToken(JSON.stringify(subscription)),
    );
  }, [callSetDeviceToken, dispatchActionPromise, publicKey]);
}

function PushNotificationsHandler(): React.Node {
  React.useEffect(() => {
    (async () => {
      if (!navigator.serviceWorker || electron) {
        return;
      }

      await navigator.serviceWorker.register('/worker/notif', { scope: '/' });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export { PushNotificationsHandler, useCreatePushSubscription };
