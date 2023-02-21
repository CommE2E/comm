// @flow

import * as React from 'react';

import {
  setDeviceToken,
  setDeviceTokenActionTypes,
} from 'lib/actions/device-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import electron from '../electron.js';
import { PushNotifModal } from '../modals/push-notif-modal.react.js';
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
  const createPushSubscription = useCreatePushSubscription();

  const modalContext = useModalContext();
  const loggedIn = useSelector(isLoggedIn);

  React.useEffect(() => {
    (async () => {
      if (!navigator.serviceWorker || electron) {
        return;
      }

      await navigator.serviceWorker.register('/worker/notif', { scope: '/' });

      if (Notification.permission === 'granted') {
        // Make sure the subscription is current if we have the permissions
        await createPushSubscription();
      } else if (Notification.permission === 'default' && loggedIn) {
        // Ask existing users that are already logged in for permission
        modalContext.pushModal(<PushNotifModal />);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ask for permission on login
  const prevLoggedIn = React.useRef(loggedIn);
  React.useEffect(() => {
    if (!navigator.serviceWorker || electron) {
      return;
    }

    if (!prevLoggedIn.current && loggedIn) {
      if (Notification.permission === 'granted') {
        createPushSubscription();
      } else if (Notification.permission === 'default') {
        modalContext.pushModal(<PushNotifModal />);
      }
    }
    prevLoggedIn.current = loggedIn;
  }, [createPushSubscription, loggedIn, modalContext, prevLoggedIn]);

  return null;
}

export { PushNotificationsHandler, useCreatePushSubscription };
