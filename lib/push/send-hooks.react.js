// @flow

import * as React from 'react';
import uuid from 'uuid';

import {
  preparePushNotifs,
  type PerUserTargetedNotifications,
} from './send-utils.js';
import { ENSCacheContext } from '../components/ens-cache-provider.react.js';
import { NeynarClientContext } from '../components/neynar-client-provider.react.js';
import { usePeerOlmSessionsCreatorContext } from '../components/peer-olm-session-creator-provider.react.js';
import { thickRawThreadInfosSelector } from '../selectors/thread-selectors.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type { MessageData } from '../types/message-types.js';
import type {
  TargetedAPNsNotification,
  TargetedAndroidNotification,
  TargetedWebNotification,
} from '../types/notif-types.js';
import { deviceToTunnelbrokerMessageTypes } from '../types/tunnelbroker/messages.js';
import type {
  TunnelbrokerAPNsNotif,
  TunnelbrokerFCMNotif,
  TunnelbrokerWebPushNotif,
} from '../types/tunnelbroker/notif-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { getMessageForException } from '../utils/errors.js';
import { useSelector } from '../utils/redux-utils.js';

function apnsNotifToTunnelbrokerAPNsNotif(
  targetedNotification: TargetedAPNsNotification,
): TunnelbrokerAPNsNotif {
  const {
    deliveryID: deviceID,
    notification: { headers, ...payload },
  } = targetedNotification;

  const newHeaders = {
    ...headers,
    'apns-push-type': 'Alert',
  };

  return {
    type: deviceToTunnelbrokerMessageTypes.TUNNELBROKER_APNS_NOTIF,
    deviceID,
    headers: JSON.stringify(newHeaders),
    payload: JSON.stringify(payload),
    clientMessageID: uuid.v4(),
  };
}

function androidNotifToTunnelbrokerFCMNotif(
  targetedNotification: TargetedAndroidNotification,
): TunnelbrokerFCMNotif {
  const {
    deliveryID: deviceID,
    notification: { data },
    priority,
  } = targetedNotification;

  return {
    type: deviceToTunnelbrokerMessageTypes.TUNNELBROKER_FCM_NOTIF,
    deviceID,
    clientMessageID: uuid.v4(),
    data: JSON.stringify(data),
    priority: priority === 'normal' ? 'NORMAL' : 'HIGH',
  };
}

function webNotifToTunnelbrokerWebPushNotif(
  targetedNotification: TargetedWebNotification,
): TunnelbrokerWebPushNotif {
  const { deliveryID: deviceID, notification } = targetedNotification;
  return {
    type: deviceToTunnelbrokerMessageTypes.TUNNELBROKER_WEB_PUSH_NOTIF,
    deviceID,
    clientMessageID: uuid.v4(),
    payload: JSON.stringify(notification),
  };
}

function useSendPushNotifs(): (
  messageDatas: $ReadOnlyArray<MessageData>,
) => Promise<?PerUserTargetedNotifications> {
  const rawMessageInfos = useSelector(state => state.messageStore.messages);
  const thickRawThreadInfos = useSelector(thickRawThreadInfosSelector);
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const userInfos = useSelector(state => state.userStore.userInfos);
  const { getENSNames } = React.useContext(ENSCacheContext);
  const getFCNames = React.useContext(NeynarClientContext)?.getFCNames;
  const { createOlmSessionsWithPeer: olmSessionCreator } =
    usePeerOlmSessionsCreatorContext();
  const { sendNotif } = useTunnelbroker();
  const { encryptedNotifUtilsAPI } = getConfig();

  return React.useCallback(
    async (messageDatas: $ReadOnlyArray<MessageData>) => {
      const deviceID = await getContentSigningKey();
      const senderDeviceDescriptor = { senderDeviceID: deviceID };

      const pushNotifsPreparationInput = {
        encryptedNotifUtilsAPI,
        senderDeviceDescriptor,
        olmSessionCreator,
        messageInfos: rawMessageInfos,
        thickRawThreadInfos,
        auxUserInfos,
        messageDatas,
        userInfos,
        getENSNames,
        getFCNames,
      };

      const preparedPushNotifs = await preparePushNotifs(
        pushNotifsPreparationInput,
      );

      if (!preparedPushNotifs) {
        return;
      }

      const sendPromises = [];
      for (const userID in preparedPushNotifs) {
        for (const notif of preparedPushNotifs[userID]) {
          if (notif.targetedNotification.notification.encryptionFailed) {
            continue;
          }
          console.log(notif.targetedNotification.deliveryID, notif.platform);
          let tunnelbrokerNotif;
          if (notif.platform === 'ios' || notif.platform === 'macos') {
            tunnelbrokerNotif = apnsNotifToTunnelbrokerAPNsNotif(
              notif.targetedNotification,
            );
          } else if (notif.platform === 'android') {
            tunnelbrokerNotif = androidNotifToTunnelbrokerFCMNotif(
              notif.targetedNotification,
            );
          } else if (notif.platform === 'web') {
            tunnelbrokerNotif = webNotifToTunnelbrokerWebPushNotif(
              notif.targetedNotification,
            );
          } else {
            continue;
          }

          sendPromises.push(
            (async () => {
              try {
                await sendNotif(tunnelbrokerNotif);
              } catch (e) {
                console.log(
                  `Failed to send notification to device: ${
                    tunnelbrokerNotif.deviceID
                  }. Details: ${getMessageForException(e) ?? ''}`,
                );
              }
            })(),
          );
        }
      }

      await Promise.all(sendPromises);
    },
    [
      sendNotif,
      encryptedNotifUtilsAPI,
      olmSessionCreator,
      rawMessageInfos,
      thickRawThreadInfos,
      auxUserInfos,
      userInfos,
      getENSNames,
      getFCNames,
    ],
  );
}

export { useSendPushNotifs };
