// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  preparePushNotifs,
  prepareOwnDevicesPushNotifs,
  type PerUserTargetedNotifications,
} from './send-utils.js';
import { ENSCacheContext } from '../components/ens-cache-provider.react.js';
import { NeynarClientContext } from '../components/neynar-client-provider.react.js';
import { usePeerOlmSessionsCreatorContext } from '../components/peer-olm-session-creator-provider.react.js';
import { thickRawThreadInfosSelector } from '../selectors/thread-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type {
  TargetedAPNsNotification,
  TargetedAndroidNotification,
  TargetedWebNotification,
  TargetedWNSNotification,
  NotificationsCreationData,
} from '../types/notif-types.js';
import { deviceToTunnelbrokerMessageTypes } from '../types/tunnelbroker/messages.js';
import type {
  TunnelbrokerAPNsNotif,
  TunnelbrokerFCMNotif,
  TunnelbrokerWebPushNotif,
  TunnelbrokerWNSNotif,
} from '../types/tunnelbroker/notif-types.js';
import { getConfig } from '../utils/config.js';
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

function wnsNotifToTunnelbrokerWNSNofif(
  targetedNotification: TargetedWNSNotification,
): TunnelbrokerWNSNotif {
  const { deliveryID: deviceID, notification } = targetedNotification;
  return {
    type: deviceToTunnelbrokerMessageTypes.TUNNELBROKER_WNS_NOTIF,
    deviceID,
    clientMessageID: uuid.v4(),
    payload: JSON.stringify(notification),
  };
}

function useSendPushNotifs(): (
  notifCreationData: ?NotificationsCreationData,
) => Promise<?PerUserTargetedNotifications> {
  const client = React.useContext(IdentityClientContext);
  invariant(client, 'Identity context should be set');
  const { getAuthMetadata } = client;
  const rawMessageInfos = useSelector(state => state.messageStore.messages);
  const thickRawThreadInfos = useSelector(thickRawThreadInfosSelector);
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const userInfos = useSelector(state => state.userStore.userInfos);
  const { getENSNames } = React.useContext(ENSCacheContext);
  const getFCNames = React.useContext(NeynarClientContext)?.getFCNames;
  const { createOlmSessionsWithUser: olmSessionCreator } =
    usePeerOlmSessionsCreatorContext();
  const { sendNotif } = useTunnelbroker();
  const { encryptedNotifUtilsAPI } = getConfig();

  return React.useCallback(
    async (notifCreationData: ?NotificationsCreationData) => {
      if (!notifCreationData) {
        return;
      }
      const { deviceID, userID: senderUserID } = await getAuthMetadata();
      if (!deviceID || !senderUserID) {
        return;
      }

      const senderDeviceDescriptor = { senderDeviceID: deviceID };
      const senderInfo = {
        senderUserID,
        senderDeviceDescriptor,
      };
      const { messageDatasWithMessageInfos, rescindData, badgeUpdateData } =
        notifCreationData;

      const pushNotifsPreparationInput = {
        encryptedNotifUtilsAPI,
        senderDeviceDescriptor,
        olmSessionCreator,
        messageInfos: rawMessageInfos,
        thickRawThreadInfos,
        auxUserInfos,
        messageDatasWithMessageInfos,
        userInfos,
        getENSNames,
        getFCNames,
      };

      const ownDevicesPushNotifsPreparationInput = {
        encryptedNotifUtilsAPI,
        senderInfo,
        olmSessionCreator,
        auxUserInfos,
        rescindData,
        badgeUpdateData,
      };

      const [preparedPushNotifs, preparedOwnDevicesPushNotifs] =
        await Promise.all([
          preparePushNotifs(pushNotifsPreparationInput),
          prepareOwnDevicesPushNotifs(ownDevicesPushNotifsPreparationInput),
        ]);

      if (!preparedPushNotifs && !prepareOwnDevicesPushNotifs) {
        return;
      }

      let allPreparedPushNotifs = preparedPushNotifs;
      if (preparedOwnDevicesPushNotifs && senderUserID) {
        allPreparedPushNotifs = {
          ...allPreparedPushNotifs,
          [senderUserID]: preparedOwnDevicesPushNotifs,
        };
      }

      const sendPromises = [];
      for (const userID in allPreparedPushNotifs) {
        for (const notif of allPreparedPushNotifs[userID]) {
          if (notif.targetedNotification.notification.encryptionFailed) {
            continue;
          }

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
          } else if (notif.platform === 'windows') {
            tunnelbrokerNotif = wnsNotifToTunnelbrokerWNSNofif(
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
      getAuthMetadata,
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
