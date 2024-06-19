// @flow

import _pickBy from 'lodash/fp/pickBy.js';
import uuidv4 from 'uuid/v4.js';

import {
  createAPNsVisualNotification,
  createAndroidVisualNotification,
  createWNSNotification,
  createWebNotification,
} from './notif-creators.js';
import {
  stringToVersionKey,
  getDevicesByPlatform,
  generateNotifUserInfoPromise,
} from './utils.js';
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
  SenderDeviceID,
  EncryptedNotifUtilsAPI,
} from '../types/notif-types.js';
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

export type PushUserInfo = {
  +devices: $ReadOnlyArray<Device>,
  +messageInfos: RawMessageInfo[],
  +messageDatas: MessageData[],
};

export type PushInfo = { +[userID: string]: PushUserInfo };

type PushUserThreadInfo = {
  +devices: $ReadOnlyArray<Device>,
  +threadIDs: Set<string>,
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
        !hasPermission(memberInfo.permissions, 'visible')
      ) {
        continue;
      }

      if (pushUserThreadInfos[memberInfo.id]) {
        pushUserThreadInfos[memberInfo.id].threadIDs.add(threadID);
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
        threadIDs: new Set([threadID]),
      };
    }
  }

  const userPushInfoPromises: { [string]: Promise<?PushUserInfo> } = {};
  const userRescindInfoPromises: { [string]: Promise<?PushUserInfo> } = {};

  for (const userID in pushUserThreadInfos) {
    const pushUserThreadInfo = pushUserThreadInfos[userID];

    userPushInfoPromises[userID] = generateNotifUserInfoPromise(
      pushTypes.NOTIF,
      pushUserThreadInfo.devices,
      newMessageInfos,
      messageDatas,
      threadsToMessageIndices,
      pushUserThreadInfo.threadIDs,
      new Set(),
      (messageID: string) => (async () => messageInfos[messageID])(),
      userID,
    );
    userRescindInfoPromises[userID] = generateNotifUserInfoPromise(
      pushTypes.RESCIND,
      pushUserThreadInfo.devices,
      newMessageInfos,
      messageDatas,
      threadsToMessageIndices,
      pushUserThreadInfo.threadIDs,
      new Set(),
      (messageID: string) => (async () => messageInfos[messageID])(),
      userID,
    );
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
  userInfos: UserInfos,
  getENSNames: ?GetENSNames,
  getFCNames: ?GetFCNames,
): Promise<?{
  +notifTexts: ResolvedNotifTexts,
  +newRawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +threadID: string,
}> {
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

  // TODO: Using types from @Ashoat check ThreadSubscription and mentioning

  const username = userInfos[userID] && userInfos[userID].username;
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

  return { notifTexts, newRawMessageInfos, threadID };
}

async function buildNotifsForUserDevices(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceID: SenderDeviceID,
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  userID: string,
  threadInfos: { +[id: string]: ThreadInfo },
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
    userInfos,
    getENSNames,
    getFCNames,
  );

  if (!notifTextWithNewRawMessageInfos) {
    return null;
  }

  const { notifTexts, newRawMessageInfos, threadID } =
    notifTextWithNewRawMessageInfos;

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
                senderDeviceID,
                notifTexts,
                newRawMessageInfos: shimmedNewRawMessageInfos,
                threadID,
                collapseKey: undefined,
                badgeOnly: false,
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
                senderDeviceID,
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
                senderDeviceID,
                notifTexts,
                newRawMessageInfos: shimmedNewRawMessageInfos,
                threadID,
                collapseKey: undefined,
                badgeOnly: false,
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
                senderDeviceID,
                unreadCount: undefined,
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
                senderDeviceID,
                unreadCount: undefined,
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
  senderDeviceID: SenderDeviceID,
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
            senderDeviceID,
            [rawMessageInfos],
            userID,
            threadInfos,
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
  senderDeviceID: SenderDeviceID,
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
    senderDeviceID,
    pushInfos,
    rawThreadInfos,
    userInfos,
    getENSNames,
    getFCNames,
  );
}

export { preparePushNotifs, generateNotifUserInfoPromise };
