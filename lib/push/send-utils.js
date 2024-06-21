// @flow

import _pickBy from 'lodash/fp/pickBy.js';
import uuidv4 from 'uuid/v4.js';

import { createAndroidVisualNotification } from './android-notif-creators.js';
import { createAPNsVisualNotification } from './apns-notif-creators.js';
import {
  stringToVersionKey,
  getDevicesByPlatform,
  generateNotifUserInfoPromise,
  userAllowsNotif,
} from './utils.js';
import { createWebNotification } from './web-notif-creators.js';
import { createWNSNotification } from './wns-notif-creators.js';
import { hasPermission } from '../permissions/minimally-encoded-thread-permissions.js';
import {
  rawMessageInfoFromMessageData,
  createMessageInfo,
  shimUnsupportedRawMessageInfos,
} from '../shared/message-utils.js';
import { pushTypes } from '../shared/messages/message-spec.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import { notifTextsForMessageInfo } from '../shared/notif-utils.js';
import {
  isMemberActive,
  threadInfoFromRawThreadInfo,
} from '../shared/thread-utils.js';
import type { AuxUserInfos } from '../types/aux-user-types.js';
import type { PlatformDetails, Platform } from '../types/device-types.js';
import {
  identityDeviceTypeToPlatform,
  type IdentityPlatformDetails,
} from '../types/identity-service-types.js';
import {
  type MessageData,
  type RawMessageInfo,
  messageDataLocalID,
} from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type {
  ResolvedNotifTexts,
  NotificationTargetDevice,
  TargetedNotificationWithPlatform,
  SenderDeviceDescriptor,
  EncryptedNotifUtilsAPI,
} from '../types/notif-types.js';
import type { ThreadSubscription } from '../types/subscription-types.js';
import type { RawThreadInfos } from '../types/thread-types.js';
import type { UserInfos } from '../types/user-types.js';
import { type GetENSNames } from '../utils/ens-helpers.js';
import { type GetFCNames } from '../utils/farcaster-helpers.js';
import { promiseAll } from '../utils/promises.js';

export type Device = {
  +platformDetails: PlatformDetails,
  +deliveryID: string,
  +cryptoID: string,
};

export type ThreadSubscriptionWithRole = $ReadOnly<{
  ...ThreadSubscription,
  role: ?string,
}>;

export type PushUserInfo = {
  +devices: $ReadOnlyArray<Device>,
  +messageInfos: RawMessageInfo[],
  +messageDatas: MessageData[],
  +subscriptions?: {
    +[threadID: string]: ThreadSubscriptionWithRole,
  },
};

export type PushInfo = { +[userID: string]: PushUserInfo };

type PushUserThreadInfo = {
  +devices: $ReadOnlyArray<Device>,
  +threadsWithSubscriptions: {
    [threadID: string]: ThreadSubscriptionWithRole,
  },
};

function identityPlatformDetailsToPlatformDetails(
  identityPlatformDetails: IdentityPlatformDetails,
): PlatformDetails {
  const { deviceType, ...rest } = identityPlatformDetails;
  return {
    ...rest,
    platform: identityDeviceTypeToPlatform[deviceType],
  };
}

async function getPushUserInfo(
  messageInfos: { +[id: string]: RawMessageInfo },
  rawThreadInfos: RawThreadInfos,
  auxUserInfos: AuxUserInfos,
  messageDatas: $ReadOnlyArray<MessageData>,
): Promise<{
  +pushInfos: ?PushInfo,
  +rescindInfos: ?PushInfo,
}> {
  if (messageDatas.length === 0) {
    return { pushInfos: null, rescindInfos: null };
  }

  const threadsToMessageIndices: Map<string, number[]> = new Map();
  const newMessageInfos: RawMessageInfo[] = [];

  let nextNewMessageIndex = 0;
  for (let i = 0; i < messageDatas.length; i++) {
    const messageData = messageDatas[i];
    const threadID = messageData.threadID;

    let messageIndices = threadsToMessageIndices.get(threadID);
    if (!messageIndices) {
      messageIndices = [];
      threadsToMessageIndices.set(threadID, messageIndices);
    }

    const newMessageIndex = nextNewMessageIndex++;
    messageIndices.push(newMessageIndex);

    const messageID = messageDataLocalID(messageData) ?? uuidv4();
    const rawMessageInfo = rawMessageInfoFromMessageData(
      messageData,
      messageID,
    );
    newMessageInfos.push(rawMessageInfo);
  }

  const pushUserThreadInfos: { [userID: string]: PushUserThreadInfo } = {};
  for (const threadID of threadsToMessageIndices.keys()) {
    const threadInfo = rawThreadInfos[threadID];
    for (const memberInfo of threadInfo.members) {
      if (
        !isMemberActive(memberInfo) ||
        !hasPermission(memberInfo.permissions, 'visible') ||
        !memberInfo.subscription
      ) {
        continue;
      }

      if (pushUserThreadInfos[memberInfo.id]) {
        pushUserThreadInfos[memberInfo.id].threadsWithSubscriptions[threadID] =
          { ...memberInfo.subscription, role: memberInfo.role };
        continue;
      }

      const devicesPlatformDetails =
        auxUserInfos[memberInfo.id].devicesPlatformDetails;

      if (!devicesPlatformDetails) {
        continue;
      }

      const devices = Object.entries(devicesPlatformDetails).map(
        ([deviceID, identityPlatformDetails]) => ({
          platformDetails: identityPlatformDetailsToPlatformDetails(
            identityPlatformDetails,
          ),
          deliveryID: deviceID,
          cryptoID: deviceID,
        }),
      );

      pushUserThreadInfos[memberInfo.id] = {
        devices,
        threadsWithSubscriptions: {
          [threadID]: { ...memberInfo.subscription, role: memberInfo.role },
        },
      };
    }
  }

  const userPushInfoPromises: { [string]: Promise<?PushUserInfo> } = {};
  const userRescindInfoPromises: { [string]: Promise<?PushUserInfo> } = {};

  for (const userID in pushUserThreadInfos) {
    const pushUserThreadInfo = pushUserThreadInfos[userID];

    userPushInfoPromises[userID] = (async () => {
      const pushInfosWithoutSubscriptions = await generateNotifUserInfoPromise(
        pushTypes.NOTIF,
        pushUserThreadInfo.devices,
        newMessageInfos,
        messageDatas,
        threadsToMessageIndices,
        Object.keys(pushUserThreadInfo.threadsWithSubscriptions),
        new Set(),
        (messageID: string) => (async () => messageInfos[messageID])(),
        userID,
      );
      if (!pushInfosWithoutSubscriptions) {
        return null;
      }
      return {
        ...pushInfosWithoutSubscriptions,
        subscriptions: pushUserThreadInfo.threadsWithSubscriptions,
      };
    })();

    userRescindInfoPromises[userID] = (async () => {
      const pushInfosWithoutSubscriptions = await generateNotifUserInfoPromise(
        pushTypes.RESCIND,
        pushUserThreadInfo.devices,
        newMessageInfos,
        messageDatas,
        threadsToMessageIndices,
        Object.keys(pushUserThreadInfo.threadsWithSubscriptions),
        new Set(),
        (messageID: string) => (async () => messageInfos[messageID])(),
        userID,
      );
      if (!pushInfosWithoutSubscriptions) {
        return null;
      }
      return {
        ...pushInfosWithoutSubscriptions,
        subscriptions: pushUserThreadInfo.threadsWithSubscriptions,
      };
    })();
  }

  const [pushInfo, rescindInfo] = await Promise.all([
    promiseAll(userPushInfoPromises),
    promiseAll(userRescindInfoPromises),
  ]);

  return {
    pushInfos: _pickBy(Boolean)(pushInfo),
    rescindInfos: _pickBy(Boolean)(rescindInfo),
  };
}

async function buildNotifText(
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  userID: string,
  threadInfos: { +[id: string]: ThreadInfo },
  subscriptions: ?{ +[threadID: string]: ThreadSubscriptionWithRole },
  userInfos: UserInfos,
  getENSNames: ?GetENSNames,
  getFCNames: ?GetFCNames,
): Promise<?{
  +notifTexts: ResolvedNotifTexts,
  +newRawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +badgeOnly: boolean,
}> {
  if (!subscriptions) {
    return null;
  }

  const hydrateMessageInfo = (rawMessageInfo: RawMessageInfo) =>
    createMessageInfo(rawMessageInfo, userID, userInfos, threadInfos);

  const newMessageInfos = [];
  const newRawMessageInfos = [];

  for (const rawMessageInfo of rawMessageInfos) {
    const newMessageInfo = hydrateMessageInfo(rawMessageInfo);
    if (newMessageInfo) {
      newMessageInfos.push(newMessageInfo);
      newRawMessageInfos.push(rawMessageInfo);
    }
  }

  if (newMessageInfos.length === 0) {
    return null;
  }

  const [{ threadID }] = newMessageInfos;
  const threadInfo = threadInfos[threadID];
  const parentThreadInfo = threadInfo.parentThreadID
    ? threadInfos[threadInfo.parentThreadID]
    : null;

  const subscription = subscriptions[threadID];
  if (!subscription) {
    return null;
  }

  const username = userInfos[userID] && userInfos[userID].username;
  const { notifAllowed, badgeOnly } = await userAllowsNotif(
    subscription,
    userID,
    newMessageInfos,
    userInfos,
    username,
    getENSNames,
  );

  if (!notifAllowed) {
    return null;
  }

  const notifTargetUserInfo = { id: userID, username };
  const notifTexts = await notifTextsForMessageInfo(
    newMessageInfos,
    threadInfo,
    parentThreadInfo,
    notifTargetUserInfo,
    getENSNames,
    getFCNames,
  );
  if (!notifTexts) {
    return null;
  }

  return { notifTexts, newRawMessageInfos, badgeOnly };
}

async function buildNotifsForUserDevices(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  userID: string,
  threadInfos: { +[id: string]: ThreadInfo },
  subscriptions: ?{ +[threadID: string]: ThreadSubscriptionWithRole },
  userInfos: UserInfos,
  getENSNames: ?GetENSNames,
  getFCNames: ?GetFCNames,
  devicesByPlatform: $ReadOnlyMap<
    Platform,
    $ReadOnlyMap<string, $ReadOnlyArray<NotificationTargetDevice>>,
  >,
): Promise<?$ReadOnlyArray<TargetedNotificationWithPlatform>> {
  const notifTextWithNewRawMessageInfos = await buildNotifText(
    rawMessageInfos,
    userID,
    threadInfos,
    subscriptions,
    userInfos,
    getENSNames,
    getFCNames,
  );

  if (!notifTextWithNewRawMessageInfos) {
    return null;
  }

  const { notifTexts, newRawMessageInfos, badgeOnly } =
    notifTextWithNewRawMessageInfos;
  const [{ threadID }] = newRawMessageInfos;

  const promises: Array<
    Promise<$ReadOnlyArray<TargetedNotificationWithPlatform>>,
  > = [];

  const iosVersionToDevices = devicesByPlatform.get('ios');
  if (iosVersionToDevices) {
    for (const [versionKey, devices] of iosVersionToDevices) {
      const { codeVersion, stateVersion } = stringToVersionKey(versionKey);
      const platformDetails = {
        platform: 'ios',
        codeVersion,
        stateVersion,
      };
      const shimmedNewRawMessageInfos = shimUnsupportedRawMessageInfos(
        newRawMessageInfos,
        platformDetails,
      );

      promises.push(
        (async () => {
          return (
            await createAPNsVisualNotification(
              encryptedNotifUtilsAPI,
              {
                senderDeviceDescriptor,
                notifTexts,
                newRawMessageInfos: shimmedNewRawMessageInfos,
                threadID,
                collapseKey: undefined,
                badgeOnly,
                unreadCount: undefined,
                platformDetails,
                uniqueID: uuidv4(),
              },
              devices,
            )
          ).map(targetedNotification => ({
            platform: 'ios',
            targetedNotification,
          }));
        })(),
      );
    }
  }

  const androidVersionToDevices = devicesByPlatform.get('android');
  if (androidVersionToDevices) {
    for (const [versionKey, devices] of androidVersionToDevices) {
      const { codeVersion, stateVersion } = stringToVersionKey(versionKey);
      const platformDetails = {
        platform: 'android',
        codeVersion,
        stateVersion,
      };
      const shimmedNewRawMessageInfos = shimUnsupportedRawMessageInfos(
        newRawMessageInfos,
        platformDetails,
      );

      promises.push(
        (async () => {
          return (
            await createAndroidVisualNotification(
              encryptedNotifUtilsAPI,
              {
                senderDeviceDescriptor,
                notifTexts,
                newRawMessageInfos: shimmedNewRawMessageInfos,
                threadID,
                collapseKey: undefined,
                unreadCount: undefined,
                platformDetails,
                notifID: uuidv4(),
              },
              devices,
            )
          ).map(targetedNotification => ({
            platform: 'android',
            targetedNotification,
          }));
        })(),
      );
    }
  }

  const macosVersionToDevices = devicesByPlatform.get('macos');
  if (macosVersionToDevices) {
    for (const [versionKey, devices] of macosVersionToDevices) {
      const { codeVersion, stateVersion, majorDesktopVersion } =
        stringToVersionKey(versionKey);
      const platformDetails = {
        platform: 'macos',
        codeVersion,
        stateVersion,
        majorDesktopVersion,
      };
      const shimmedNewRawMessageInfos = shimUnsupportedRawMessageInfos(
        newRawMessageInfos,
        platformDetails,
      );

      promises.push(
        (async () => {
          return (
            await createAPNsVisualNotification(
              encryptedNotifUtilsAPI,
              {
                senderDeviceDescriptor,
                notifTexts,
                newRawMessageInfos: shimmedNewRawMessageInfos,
                threadID,
                collapseKey: undefined,
                badgeOnly,
                unreadCount: undefined,
                platformDetails,
                uniqueID: uuidv4(),
              },
              devices,
            )
          ).map(targetedNotification => ({
            platform: 'macos',
            targetedNotification,
          }));
        })(),
      );
    }
  }

  const windowsVersionToDevices = devicesByPlatform.get('windows');
  if (windowsVersionToDevices) {
    for (const [versionKey, devices] of windowsVersionToDevices) {
      const { codeVersion, stateVersion, majorDesktopVersion } =
        stringToVersionKey(versionKey);
      const platformDetails = {
        platform: 'windows',
        codeVersion,
        stateVersion,
        majorDesktopVersion,
      };

      promises.push(
        (async () => {
          return (
            await createWNSNotification(
              encryptedNotifUtilsAPI,
              {
                notifTexts,
                threadID,
                senderDeviceDescriptor,
                platformDetails,
              },
              devices,
            )
          ).map(targetedNotification => ({
            platform: 'windows',
            targetedNotification,
          }));
        })(),
      );
    }
  }

  const webVersionToDevices = devicesByPlatform.get('web');
  if (webVersionToDevices) {
    for (const [versionKey, devices] of webVersionToDevices) {
      const { codeVersion, stateVersion } = stringToVersionKey(versionKey);
      const platformDetails = {
        platform: 'web',
        codeVersion,
        stateVersion,
      };

      promises.push(
        (async () => {
          return (
            await createWebNotification(
              encryptedNotifUtilsAPI,
              {
                notifTexts,
                threadID,
                senderDeviceDescriptor,
                platformDetails,
                id: uuidv4(),
              },
              devices,
            )
          ).map(targetedNotification => ({
            platform: 'web',
            targetedNotification,
          }));
        })(),
      );
    }
  }

  return (await Promise.all(promises)).flat();
}

async function buildNotifsFromPushInfo(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  pushInfo: PushInfo,
  rawThreadInfos: RawThreadInfos,
  userInfos: UserInfos,
  getENSNames: ?GetENSNames,
  getFCNames: ?GetFCNames,
): Promise<{
  +[userID: string]: $ReadOnlyArray<TargetedNotificationWithPlatform>,
}> {
  const threadIDs = new Set<string>();

  for (const userID in pushInfo) {
    for (const rawMessageInfo of pushInfo[userID].messageInfos) {
      const threadID = rawMessageInfo.threadID;
      threadIDs.add(threadID);

      const messageSpec = messageSpecs[rawMessageInfo.type];
      if (messageSpec.threadIDs) {
        for (const id of messageSpec.threadIDs(rawMessageInfo)) {
          threadIDs.add(id);
        }
      }
    }
  }

  const perUserBuildNotifsResultPromises: {
    [userID: string]: Promise<$ReadOnlyArray<TargetedNotificationWithPlatform>>,
  } = {};

  for (const userID in pushInfo) {
    const threadInfos = Object.fromEntries(
      [...threadIDs].map(threadID => [
        threadID,
        threadInfoFromRawThreadInfo(
          rawThreadInfos[threadID],
          userID,
          userInfos,
        ),
      ]),
    );
    const devicesByPlatform = getDevicesByPlatform(pushInfo[userID].devices);
    const singleNotificationPromises = [];

    for (const rawMessageInfos of pushInfo[userID].messageInfos) {
      singleNotificationPromises.push(
        (async () => {
          return await buildNotifsForUserDevices(
            encryptedNotifUtilsAPI,
            senderDeviceDescriptor,
            [rawMessageInfos],
            userID,
            threadInfos,
            pushInfo[userID].subscriptions,
            userInfos,
            getENSNames,
            getFCNames,
            devicesByPlatform,
          );
        })(),
      );
    }

    perUserBuildNotifsResultPromises[userID] = (async () => {
      return (await Promise.all(singleNotificationPromises))
        .filter(Boolean)
        .flat();
    })();
  }

  return promiseAll(perUserBuildNotifsResultPromises);
}

async function preparePushNotifs(
  encryptedUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  messageInfos: { +[id: string]: RawMessageInfo },
  rawThreadInfos: RawThreadInfos,
  auxUserInfos: AuxUserInfos,
  messageDatas: $ReadOnlyArray<MessageData>,
  userInfos: UserInfos,
  getENSNames: ?GetENSNames,
  getFCNames: ?GetFCNames,
): Promise<?{
  +[userID: string]: $ReadOnlyArray<TargetedNotificationWithPlatform>,
}> {
  const { pushInfos } = await getPushUserInfo(
    messageInfos,
    rawThreadInfos,
    auxUserInfos,
    messageDatas,
  );

  if (!pushInfos) {
    return null;
  }

  return await buildNotifsFromPushInfo(
    encryptedUtilsAPI,
    senderDeviceDescriptor,
    pushInfos,
    rawThreadInfos,
    userInfos,
    getENSNames,
    getFCNames,
  );
}

export { preparePushNotifs, generateNotifUserInfoPromise };
