// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

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
import { convertNotificationThreadIDToNewIDSchema } from 'lib/utils/migration-utils.js';
import {
  shouldSkipPushPermissionAlert,
  recordNotifPermissionAlertActionType,
} from 'lib/utils/push-alerts.js';

import electron from '../electron.js';
import PushNotifModal from '../modals/push-notif-modal.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';

function useCreateDesktopPushSubscription() {
  const dispatchActionPromise = useDispatchActionPromise();
  const callSetDeviceToken = useServerCall(setDeviceToken);

  React.useEffect(
    () =>
      electron?.onDeviceTokenRegistered?.(token => {
        dispatchActionPromise(
          setDeviceTokenActionTypes,
          callSetDeviceToken(token),
        );
      }),
    [callSetDeviceToken, dispatchActionPromise],
  );

  const dispatch = useDispatch();

  React.useEffect(
    () =>
      electron?.onNotificationClicked?.(({ threadID }) => {
        const convertedThreadID =
          convertNotificationThreadIDToNewIDSchema(threadID);

        const payload = {
          chatMode: 'view',
          activeChatThreadID: convertedThreadID,
          tab: 'chat',
        };

        dispatch({ type: updateNavInfoActionType, payload });
      }),
    [dispatch],
  );
}

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
  useCreateDesktopPushSubscription();
  const createPushSubscription = useCreatePushSubscription();

  const notifPermissionAlertInfo = useSelector(
    state => state.notifPermissionAlertInfo,
  );

  const modalContext = useModalContext();
  const loggedIn = useSelector(isLoggedIn);

  const dispatch = useDispatch();

  const supported = 'Notification' in window && !electron;

  React.useEffect(() => {
    (async () => {
      if (!navigator.serviceWorker || !supported) {
        return;
      }

      await navigator.serviceWorker.register('/worker/notif', { scope: '/' });

      if (Notification.permission === 'granted') {
        // Make sure the subscription is current if we have the permissions
        await createPushSubscription();
      } else if (
        Notification.permission === 'default' &&
        loggedIn &&
        !shouldSkipPushPermissionAlert(notifPermissionAlertInfo)
      ) {
        // Ask existing users that are already logged in for permission
        modalContext.pushModal(<PushNotifModal />);
        dispatch({
          type: recordNotifPermissionAlertActionType,
          payload: { time: Date.now() },
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ask for permission on login
  const prevLoggedIn = React.useRef(loggedIn);
  React.useEffect(() => {
    if (!navigator.serviceWorker || !supported) {
      return;
    }

    if (!prevLoggedIn.current && loggedIn) {
      if (Notification.permission === 'granted') {
        createPushSubscription();
      } else if (
        Notification.permission === 'default' &&
        !shouldSkipPushPermissionAlert(notifPermissionAlertInfo)
      ) {
        modalContext.pushModal(<PushNotifModal />);
        dispatch({
          type: recordNotifPermissionAlertActionType,
          payload: { time: Date.now() },
        });
      }
    }
    prevLoggedIn.current = loggedIn;
  }, [
    createPushSubscription,
    dispatch,
    loggedIn,
    modalContext,
    notifPermissionAlertInfo,
    prevLoggedIn,
    supported,
  ]);

  // Redirect to thread on notification click
  React.useEffect(() => {
    if (!navigator.serviceWorker || !supported) {
      return undefined;
    }

    const callback = (event: MessageEvent) => {
      if (typeof event.data !== 'object' || !event.data) {
        return;
      }

      if (event.data.targetThreadID) {
        const payload = {
          chatMode: 'view',
          activeChatThreadID: event.data.targetThreadID,
          tab: 'chat',
        };

        dispatch({ type: updateNavInfoActionType, payload });
      }
    };

    navigator.serviceWorker.addEventListener('message', callback);
    return () =>
      navigator.serviceWorker?.removeEventListener('message', callback);
  }, [dispatch, supported]);

  return null;
}

export { PushNotificationsHandler, useCreatePushSubscription };
