// @flow

import invariant from 'invariant';
import _groupBy from 'lodash/fp/groupBy.js';
import * as React from 'react';
import uuid from 'uuid';

import type { LargeNotifData } from './crypto.js';
import {
  preparePushNotifs,
  prepareOwnDevicesPushNotifs,
  type PerUserTargetedNotifications,
} from './send-utils.js';
import { ENSCacheContext } from '../components/ens-cache-provider.react.js';
import { NeynarClientContext } from '../components/neynar-client-provider.react.js';
import { usePeerOlmSessionsCreatorContext } from '../components/peer-olm-session-creator-provider.react.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import type { AuthMetadata } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type {
  TargetedAPNsNotification,
  TargetedAndroidNotification,
  TargetedWebNotification,
  TargetedWNSNotification,
  NotificationsCreationData,
  EncryptedNotifUtilsAPI,
} from '../types/notif-types.js';
import { deviceToTunnelbrokerMessageTypes } from '../types/tunnelbroker/messages.js';
import type {
  TunnelbrokerAPNsNotif,
  TunnelbrokerFCMNotif,
  TunnelbrokerWebPushNotif,
  TunnelbrokerWNSNotif,
} from '../types/tunnelbroker/notif-types.js';
import { uploadBlob, assignMultipleHolders } from '../utils/blob-service.js';
import { getConfig } from '../utils/config.js';
import { getMessageForException } from '../utils/errors.js';
import { values } from '../utils/objects.js';
import { useSelector } from '../utils/redux-utils.js';
import { createDefaultHTTPRequestHeaders } from '../utils/services-utils.js';

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
      const authMetadata = await getAuthMetadata();
      const { deviceID, userID: senderUserID } = authMetadata;

      if (!deviceID || !senderUserID) {
        return;
      }

      const senderDeviceDescriptor = { senderDeviceID: deviceID };
      const senderInfo = {
        senderUserID,
        senderDeviceDescriptor,
      };
      const {
        messageDatasWithMessageInfos,
        rawThreadInfos,
        rescindData,
        badgeUpdateData,
      } = notifCreationData;

      const pushNotifsPreparationInput = {
        encryptedNotifUtilsAPI,
        senderDeviceDescriptor,
        olmSessionCreator,
        messageInfos: rawMessageInfos,
        notifCreationData:
          messageDatasWithMessageInfos && rawThreadInfos
            ? {
                thickRawThreadInfos: rawThreadInfos,
                messageDatasWithMessageInfos,
              }
            : null,
        auxUserInfos,
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

      let allPreparedPushNotifs: ?PerUserTargetedNotifications =
        preparedPushNotifs;

      if (preparedOwnDevicesPushNotifs && senderUserID) {
        allPreparedPushNotifs = {
          ...allPreparedPushNotifs,
          [senderUserID]: {
            targetedNotifications: preparedOwnDevicesPushNotifs,
          },
        };
      }

      if (preparedPushNotifs) {
        try {
          await uploadLargeNotifBlobs(
            preparedPushNotifs,
            authMetadata,
            encryptedNotifUtilsAPI,
          );
        } catch (e) {
          console.log('Failed to upload blobs', e);
        }
      }

      const sendPromises = [];
      for (const userID in allPreparedPushNotifs) {
        for (const notif of allPreparedPushNotifs[userID]
          .targetedNotifications) {
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
      auxUserInfos,
      userInfos,
      getENSNames,
      getFCNames,
    ],
  );
}

async function uploadLargeNotifBlobs(
  pushNotifs: PerUserTargetedNotifications,
  authMetadata: AuthMetadata,
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
): Promise<void> {
  const largeNotifArray = values(pushNotifs)
    .map(({ largeNotifDataArray }) => largeNotifDataArray)
    .flat();

  if (largeNotifArray.length === 0) {
    return;
  }

  const largeNotifsByHash: {
    +[blobHash: string]: $ReadOnlyArray<LargeNotifData>,
  } = _groupBy(largeNotifData => largeNotifData.blobHash)(largeNotifArray);

  const uploads = Object.entries(largeNotifsByHash).map(
    ([blobHash, [{ encryptedCopyWithMessageInfos }]]) => ({
      blobHash,
      encryptedCopyWithMessageInfos,
    }),
  );

  const assignments = Object.entries(largeNotifsByHash)
    .map(([blobHash, largeNotifs]) =>
      largeNotifs
        .map(({ blobHolders }) => blobHolders)
        .flat()
        .map(holder => ({ blobHash, holder })),
    )
    .flat();

  const authHeaders = createDefaultHTTPRequestHeaders(authMetadata);
  const uploadPromises = uploads.map(
    ({ blobHash, encryptedCopyWithMessageInfos }) =>
      uploadBlob(
        encryptedNotifUtilsAPI.normalizeUint8ArrayForBlobUpload(
          encryptedCopyWithMessageInfos,
        ),
        blobHash,
        authHeaders,
      ),
  );
  const assignmentPromise = assignMultipleHolders(assignments, authHeaders);

  const [uploadResults, assignmentResult] = await Promise.all([
    Promise.all(uploadPromises),
    assignmentPromise,
  ]);

  for (const uploadResult of uploadResults) {
    if (uploadResult.success) {
      continue;
    }
    const { reason, statusText } = uploadResult;
    console.log(
      `Failed to upload. Reason: ${reason}, status text: ${statusText}`,
    );
  }

  if (assignmentResult.result === 'success') {
    return;
  }

  if (assignmentResult.result === 'error') {
    const { statusText } = assignmentResult;
    console.log(`Failed to assign all holders. Status text: ${statusText}`);
    return;
  }

  for (const [blobHash, holder] of assignmentResult.failedRequests) {
    console.log(`Assingnemt failed for holder: ${holder} and hash ${blobHash}`);
  }
}
export { useSendPushNotifs };
