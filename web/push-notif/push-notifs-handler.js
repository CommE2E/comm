// @flow

import invariant from 'invariant';
import * as React from 'react';

import { recordAlertActionType } from 'lib/actions/alert-actions.js';
import {
  useSetDeviceTokenFanout,
  setDeviceTokenActionTypes,
} from 'lib/actions/device-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import {
  alertTypes,
  type RecordAlertActionPayload,
} from 'lib/types/alert-types.js';
import { isDesktopPlatform } from 'lib/types/device-types.js';
import type { SenderDeviceDescriptor } from 'lib/types/notif-types.js';
import { getConfig } from 'lib/utils/config.js';
import { shouldSkipPushPermissionAlert } from 'lib/utils/push-alerts.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import {
  decryptDesktopNotification,
  migrateLegacyOlmNotificationsSessions,
} from './notif-crypto-utils.js';
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
          undefined,
          { type: 'device_token', deviceToken: token },
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
        senderDeviceDescriptor,
        type: messageType,
      }: {
        encryptedPayload: string,
        type: string,
        senderDeviceDescriptor: SenderDeviceDescriptor,
      }) => {
        const decryptedPayload = await decryptDesktopNotification(
          encryptedPayload,
          messageType,
          staffCanSee,
          senderDeviceDescriptor,
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
          const payload = {
            chatMode: 'view',
            activeChatThreadID: threadID,
            tab: 'chat',
          };

          dispatch({ type: updateNavInfoActionType, payload });
        },
      ),
    [dispatch],
  );

  // Handle invalid device token
  const localToken = useSelector(
    state => state.tunnelbrokerDeviceToken.localToken,
  );
  const prevLocalToken = React.useRef(localToken);
  React.useEffect(() => {
    if (prevLocalToken.current && !localToken) {
      electron?.fetchDeviceToken?.();
    }

    prevLocalToken.current = localToken;
  }, [localToken]);
}

function useCreatePushSubscription(): () => Promise<void> {
  const publicKey = useSelector(state => state.pushApiPublicKey);

  const dispatchActionPromise = useDispatchActionPromise();
  const callSetDeviceToken = useSetDeviceTokenFanout();
  const staffCanSee = useStaffCanSee();

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { getAuthMetadata } = identityContext;

  return React.useCallback(async () => {
    if (!publicKey) {
      return;
    }

    const workerRegistration = await navigator.serviceWorker?.ready;
    const authMetadata = await getAuthMetadata();
    if (
      !workerRegistration ||
      !workerRegistration.pushManager ||
      !authMetadata
    ) {
      return;
    }

    workerRegistration.active?.postMessage({
      olmWasmPath: getOlmWasmPath(),
      staffCanSee,
      authMetadata,
    });

    const subscription = await workerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });

    const token = JSON.stringify(subscription);
    void dispatchActionPromise(
      setDeviceTokenActionTypes,
      callSetDeviceToken(token),
      undefined,
      { type: 'device_token', deviceToken: token },
    );
  }, [
    callSetDeviceToken,
    dispatchActionPromise,
    publicKey,
    staffCanSee,
    getAuthMetadata,
  ]);
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

        const payload: RecordAlertActionPayload = {
          alertType: alertTypes.NOTIF_PERMISSION,
          time: Date.now(),
        };

        dispatch({
          type: recordAlertActionType,
          payload,
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

        const payload: RecordAlertActionPayload = {
          alertType: alertTypes.NOTIF_PERMISSION,
          time: Date.now(),
        };

        dispatch({
          type: recordAlertActionType,
          payload,
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

  // Handle invalid device token
  const localToken = useSelector(
    state => state.tunnelbrokerDeviceToken.localToken,
  );
  const prevLocalToken = React.useRef(localToken);
  React.useEffect(() => {
    if (
      !navigator.serviceWorker ||
      !supported ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    if (prevLocalToken.current && !localToken) {
      void createPushSubscription();
    }

    prevLocalToken.current = localToken;
  }, [createPushSubscription, localToken, supported]);

  return null;
}

export { PushNotificationsHandler, useCreatePushSubscription };
