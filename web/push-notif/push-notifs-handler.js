// @flow

import * as React from 'react';

import {
  useSetDeviceTokenFanout,
  setDeviceTokenActionTypes,
} from 'lib/actions/device-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import { alertTypes } from 'lib/types/alert-types.js';
import { isDesktopPlatform } from 'lib/types/device-types.js';
import { getConfig } from 'lib/utils/config.js';
import { convertNonPendingIDToNewSchema } from 'lib/utils/migration-utils.js';
import {
  shouldSkipPushPermissionAlert,
  recordNotifPermissionAlertActionType,
} from 'lib/utils/push-alerts.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import {
  decryptDesktopNotification,
  migrateLegacyOlmNotificationsSessions,
} from './notif-crypto-utils.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import electron from '../electron.js';
import PushNotifModal from '../modals/push-notif-modal.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { getOlmWasmPath } from '../shared-worker/utils/constants.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

function useCreateDesktopPushSubscription() {
  const dispatchActionPromise = useDispatchActionPromise();
  const callSetDeviceToken = useSetDeviceTokenFanout();
  const staffCanSee = useStaffCanSee();
  const [notifsOlmSessionMigrated, setNotifsSessionsMigrated] =
    React.useState<boolean>(false);
  const platformDetails = getConfig().platformDetails;

  React.useEffect(() => {
    if (
      !isDesktopPlatform(platformDetails.platform) ||
      !hasMinCodeVersion(platformDetails, { majorDesktop: 12 })
    ) {
      return;
    }
    void (async () => {
      await migrateLegacyOlmNotificationsSessions();
      setNotifsSessionsMigrated(true);
    })();
  }, [platformDetails]);

  React.useEffect(
    () =>
      electron?.onDeviceTokenRegistered?.((token: ?string) => {
        void dispatchActionPromise(
          setDeviceTokenActionTypes,
          callSetDeviceToken(token),
        );
      }),
    [callSetDeviceToken, dispatchActionPromise],
  );

  React.useEffect(() => {
    electron?.fetchDeviceToken?.();
  }, []);

  React.useEffect(() => {
    if (
      hasMinCodeVersion(platformDetails, { majorDesktop: 12 }) &&
      !notifsOlmSessionMigrated
    ) {
      return undefined;
    }

    return electron?.onEncryptedNotification?.(
      async ({
        encryptedPayload,
        keyserverID,
      }: {
        encryptedPayload: string,
        keyserverID?: string,
      }) => {
        const decryptedPayload = await decryptDesktopNotification(
          encryptedPayload,
          staffCanSee,
          keyserverID,
        );
        electron?.showDecryptedNotification(decryptedPayload);
      },
    );
  }, [staffCanSee, notifsOlmSessionMigrated, platformDetails]);

  const dispatch = useDispatch();

  React.useEffect(
    () =>
      electron?.onNotificationClicked?.(
        ({ threadID }: { +threadID: string }) => {
          const convertedThreadID = convertNonPendingIDToNewSchema(
            threadID,
            authoritativeKeyserverID,
          );

          const payload = {
            chatMode: 'view',
            activeChatThreadID: convertedThreadID,
            tab: 'chat',
          };

          dispatch({ type: updateNavInfoActionType, payload });
        },
      ),
    [dispatch],
  );
}

function useCreatePushSubscription(): () => Promise<void> {
  const publicKey = useSelector(state => state.pushApiPublicKey);

  const dispatchActionPromise = useDispatchActionPromise();
  const callSetDeviceToken = useSetDeviceTokenFanout();
  const staffCanSee = useStaffCanSee();

  return React.useCallback(async () => {
    if (!publicKey) {
      return;
    }

    const workerRegistration = await navigator.serviceWorker?.ready;
    if (!workerRegistration || !workerRegistration.pushManager) {
      return;
    }

    workerRegistration.active?.postMessage({
      olmWasmPath: getOlmWasmPath(),
      staffCanSee,
    });

    const subscription = await workerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });

    void dispatchActionPromise(
      setDeviceTokenActionTypes,
      callSetDeviceToken(JSON.stringify(subscription)),
    );
  }, [callSetDeviceToken, dispatchActionPromise, publicKey, staffCanSee]);
}

function PushNotificationsHandler(): React.Node {
  useCreateDesktopPushSubscription();
  const createPushSubscription = useCreatePushSubscription();

  const notifPermissionAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.NOTIF_PERMISSION],
  );

  const modalContext = useModalContext();
  const loggedIn = useSelector(isLoggedIn);

  const dispatch = useDispatch();

  const supported = 'Notification' in window && !electron;

  React.useEffect(() => {
    void (async () => {
      if (!navigator.serviceWorker || !supported) {
        return;
      }

      await navigator.serviceWorker.register('worker/notif', { scope: '/' });

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
        void createPushSubscription();
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
