// @flow

import _pickBy from 'lodash/fp/pickBy.js';
import uuidv4 from 'uuid/v4.js';

import {
  createAndroidVisualNotification,
  createAndroidBadgeOnlyNotification,
  createAndroidNotificationRescind,
} from './android-notif-creators.js';
import {
  createAPNsVisualNotification,
  createAPNsBadgeOnlyNotification,
  createAPNsNotificationRescind,
} from './apns-notif-creators.js';
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
  createMessageInfo,
  shimUnsupportedRawMessageInfos,
  sortMessageInfoList,
} from '../shared/message-utils.js';
import { pushTypes } from '../shared/messages/message-spec.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import {
  notifTextsForMessageInfo,
  getNotifCollapseKey,
} from '../shared/notif-utils.js';
import {
  isMemberActive,
  threadInfoFromRawThreadInfo,
} from '../shared/thread-utils.js';
import { hasMinCodeVersion } from '../shared/version-utils.js';
import type { AuxUserInfos } from '../types/aux-user-types.js';
import type { PlatformDetails, Platform } from '../types/device-types.js';
import {
  identityDeviceTypeToPlatform,
  type IdentityPlatformDetails,
} from '../types/identity-service-types.js';
import {
  type MessageData,
  type RawMessageInfo,
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
import type { ThickRawThreadInfos } from '../types/thread-types.js';
import type { UserInfos } from '../types/user-types.js';
import { getConfig } from '../utils/config.js';
import type { DeviceSessionCreationRequest } from '../utils/crypto-utils.js';
import { type GetENSNames } from '../utils/ens-helpers.js';
import { type GetFCNames } from '../utils/farcaster-helpers.js';
import { values } from '../utils/objects.js';
import { promiseAll } from '../utils/promises.js';

export type Device = {
  +platformDetails: PlatformDetails,
  +deliveryID: string,
  +cryptoID: string,
};

export type ThreadSubscriptionWithRole = $ReadOnly<{
  ...ThreadSubscription,
  +role: ?string,
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

export type CollapsableNotifInfo = {
  collapseKey: ?string,
  existingMessageInfos: RawMessageInfo[],
  newMessageInfos: RawMessageInfo[],
};

export type FetchCollapsableNotifsResult = {
  +[userID: string]: $ReadOnlyArray<CollapsableNotifInfo>,
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
  thickRawThreadInfos: ThickRawThreadInfos,
  auxUserInfos: AuxUserInfos,
  messageDataWithMessageInfos: ?$ReadOnlyArray<{
    +messageData: MessageData,
    +rawMessageInfo: RawMessageInfo,
  }>,
): Promise<{
  +pushInfos: ?PushInfo,
  +rescindInfos: ?PushInfo,
}> {
  if (!messageDataWithMessageInfos) {
    return { pushInfos: null, rescindInfos: null };
  }

  const threadsToMessageIndices: Map<string, number[]> = new Map();
  const newMessageInfos: RawMessageInfo[] = [];
  const messageDatas: MessageData[] = [];

  let nextNewMessageIndex = 0;
  for (const messageDataWithInfo of messageDataWithMessageInfos) {
    const { messageData, rawMessageInfo } = messageDataWithInfo;

    const threadID = messageData.threadID;

    let messageIndices = threadsToMessageIndices.get(threadID);
    if (!messageIndices) {
      messageIndices = [];
      threadsToMessageIndices.set(threadID, messageIndices);
    }

    const newMessageIndex = nextNewMessageIndex++;
    messageIndices.push(newMessageIndex);
    messageDatas.push(messageData);
    newMessageInfos.push(rawMessageInfo);
  }

  const pushUserThreadInfos: {
    [userID: string]: {
      devices: $ReadOnlyArray<Device>,
      threadsWithSubscriptions: {
        [threadID: string]: ThreadSubscriptionWithRole,
      },
    },
  } = {};

  for (const threadID of threadsToMessageIndices.keys()) {
    const threadInfo = thickRawThreadInfos[threadID];
    for (const memberInfo of threadInfo.members) {
      if (
        !isMemberActive(memberInfo) ||
        !hasPermission(memberInfo.permissions, 'visible')
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
      const pushInfosWithoutSubscriptions = await generateNotifUserInfoPromise({
        pushType: pushTypes.NOTIF,
        devices: pushUserThreadInfo.devices,
        newMessageInfos,
        messageDatas,
        threadsToMessageIndices,
        threadIDs: Object.keys(pushUserThreadInfo.threadsWithSubscriptions),
        userNotMemberOfSubthreads: new Set(),
        fetchMessageInfoByID: (messageID: string) =>
          (async () => messageInfos[messageID])(),
        userID,
      });
      if (!pushInfosWithoutSubscriptions) {
        return null;
      }
      return {
        ...pushInfosWithoutSubscriptions,
        subscriptions: pushUserThreadInfo.threadsWithSubscriptions,
      };
    })();

    userRescindInfoPromises[userID] = (async () => {
      const pushInfosWithoutSubscriptions = await generateNotifUserInfoPromise({
        pushType: pushTypes.RESCIND,
        devices: pushUserThreadInfo.devices,
        newMessageInfos,
        messageDatas,
        threadsToMessageIndices,
        threadIDs: Object.keys(pushUserThreadInfo.threadsWithSubscriptions),
        userNotMemberOfSubthreads: new Set(),
        fetchMessageInfoByID: (messageID: string) =>
          (async () => messageInfos[messageID])(),
        userID,
      });
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

type SenderInfo = {
  +senderUserID: string,
  +senderDeviceDescriptor: SenderDeviceDescriptor,
};

type OwnDevicesPushInfo = {
  +devices: $ReadOnlyArray<Device>,
};

function getOwnDevicesPushInfo(
  senderInfo: SenderInfo,
  auxUserInfos: AuxUserInfos,
): ?OwnDevicesPushInfo {
  const {
    senderUserID,
    senderDeviceDescriptor: { senderDeviceID },
  } = senderInfo;

  if (!senderDeviceID) {
    return null;
  }

  const senderDevicesWithPlatformDetails =
    auxUserInfos[senderUserID].devicesPlatformDetails;

  if (!senderDevicesWithPlatformDetails) {
    return null;
  }

  const devices = Object.entries(senderDevicesWithPlatformDetails)
    .filter(([deviceID]) => deviceID !== senderDeviceID)
    .map(([deviceID, identityPlatformDetails]) => ({
      platformDetails: identityPlatformDetailsToPlatformDetails(
        identityPlatformDetails,
      ),
      deliveryID: deviceID,
      cryptoID: deviceID,
    }));

  return { devices };
}

function pushInfoToCollapsableNotifInfo(pushInfo: PushInfo): {
  +usersToCollapseKeysToInfo: {
    +[string]: { +[string]: CollapsableNotifInfo },
  },
  +usersToCollapsableNotifInfo: {
    +[string]: $ReadOnlyArray<CollapsableNotifInfo>,
  },
} {
  const usersToCollapseKeysToInfo: {
    [string]: { [string]: CollapsableNotifInfo },
  } = {};
  const usersToCollapsableNotifInfo: { [string]: Array<CollapsableNotifInfo> } =
    {};
  for (const userID in pushInfo) {
    usersToCollapseKeysToInfo[userID] = {};
    usersToCollapsableNotifInfo[userID] = [];
    for (let i = 0; i < pushInfo[userID].messageInfos.length; i++) {
      const rawMessageInfo = pushInfo[userID].messageInfos[i];
      const messageData = pushInfo[userID].messageDatas[i];
      const collapseKey = getNotifCollapseKey(rawMessageInfo, messageData);
      if (!collapseKey) {
        const collapsableNotifInfo: CollapsableNotifInfo = {
          collapseKey,
          existingMessageInfos: [],
          newMessageInfos: [rawMessageInfo],
        };
        usersToCollapsableNotifInfo[userID].push(collapsableNotifInfo);
        continue;
      }
      if (!usersToCollapseKeysToInfo[userID][collapseKey]) {
        usersToCollapseKeysToInfo[userID][collapseKey] = ({
          collapseKey,
          existingMessageInfos: [],
          newMessageInfos: [],
        }: CollapsableNotifInfo);
      }
      usersToCollapseKeysToInfo[userID][collapseKey].newMessageInfos.push(
        rawMessageInfo,
      );
    }
  }

  return {
    usersToCollapseKeysToInfo,
    usersToCollapsableNotifInfo,
  };
}

function mergeUserToCollapsableInfo(
  usersToCollapseKeysToInfo: {
    +[string]: { +[string]: CollapsableNotifInfo },
  },
  usersToCollapsableNotifInfo: {
    +[string]: $ReadOnlyArray<CollapsableNotifInfo>,
  },
): { +[string]: $ReadOnlyArray<CollapsableNotifInfo> } {
  const mergedUsersToCollapsableInfo: {
    [string]: Array<CollapsableNotifInfo>,
  } = {};

  for (const userID in usersToCollapseKeysToInfo) {
    const collapseKeysToInfo = usersToCollapseKeysToInfo[userID];

    mergedUsersToCollapsableInfo[userID] = [
      ...usersToCollapsableNotifInfo[userID],
    ];

    for (const collapseKey in collapseKeysToInfo) {
      const info = collapseKeysToInfo[collapseKey];
      mergedUsersToCollapsableInfo[userID].push({
        collapseKey: info.collapseKey,
        existingMessageInfos: sortMessageInfoList(info.existingMessageInfos),
        newMessageInfos: sortMessageInfoList(info.newMessageInfos),
      });
    }
  }

  return mergedUsersToCollapsableInfo;
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
  const { notifAllowed, badgeOnly } = await userAllowsNotif({
    subscription,
    userID,
    newMessageInfos,
    userInfos,
    username,
    getENSNames,
  });

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
type BuildNotifsForPlatformInput<
  PlatformType: Platform,
  NotifCreatorinputBase,
  TargetedNotificationType,
  NotifCreatorInput: { +platformDetails: PlatformDetails, ... },
> = {
  +platform: PlatformType,
  +encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  +notifCreatorCallback: (
    encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
    input: NotifCreatorInput,
    devices: $ReadOnlyArray<NotificationTargetDevice>,
  ) => Promise<$ReadOnlyArray<TargetedNotificationType>>,
  +notifCreatorInputBase: NotifCreatorinputBase,
  +transformInputBase: (
    inputBase: NotifCreatorinputBase,
    platformDetails: PlatformDetails,
  ) => NotifCreatorInput,
  +versionToDevices: $ReadOnlyMap<
    string,
    $ReadOnlyArray<NotificationTargetDevice>,
  >,
};

async function buildNotifsForPlatform<
  PlatformType: Platform,
  NotifCreatorinputBase,
  TargetedNotificationType,
  NotifCreatorInput: { +platformDetails: PlatformDetails, ... },
>(
  input: BuildNotifsForPlatformInput<
    PlatformType,
    NotifCreatorinputBase,
    TargetedNotificationType,
    NotifCreatorInput,
  >,
): Promise<
  $ReadOnlyArray<{
    +platform: PlatformType,
    +targetedNotification: TargetedNotificationType,
  }>,
> {
  const {
    encryptedNotifUtilsAPI,
    versionToDevices,
    notifCreatorCallback,
    notifCreatorInputBase,
    platform,
    transformInputBase,
  } = input;

  const promises: Array<
    Promise<
      $ReadOnlyArray<{
        +platform: PlatformType,
        +targetedNotification: TargetedNotificationType,
      }>,
    >,
  > = [];

  for (const [versionKey, devices] of versionToDevices) {
    const { codeVersion, stateVersion, majorDesktopVersion } =
      stringToVersionKey(versionKey);

    const platformDetails = {
      platform,
      codeVersion,
      stateVersion,
      majorDesktopVersion,
    };

    const inputData = transformInputBase(
      notifCreatorInputBase,
      platformDetails,
    );

    promises.push(
      (async () => {
        return (
          await notifCreatorCallback(encryptedNotifUtilsAPI, inputData, devices)
        ).map(targetedNotification => ({
          platform,
          targetedNotification,
        }));
      })(),
    );
  }

  return (await Promise.all(promises)).flat();
}

type BuildNotifsForUserDevicesInputData = {
  +encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  +senderDeviceDescriptor: SenderDeviceDescriptor,
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +userID: string,
  +threadInfos: { +[id: string]: ThreadInfo },
  +subscriptions: ?{ +[threadID: string]: ThreadSubscriptionWithRole },
  +userInfos: UserInfos,
  +getENSNames: ?GetENSNames,
  +getFCNames: ?GetFCNames,
  +devicesByPlatform: $ReadOnlyMap<
    Platform,
    $ReadOnlyMap<string, $ReadOnlyArray<NotificationTargetDevice>>,
  >,
};

async function buildNotifsForUserDevices(
  inputData: BuildNotifsForUserDevicesInputData,
): Promise<?$ReadOnlyArray<TargetedNotificationWithPlatform>> {
  const {
    encryptedNotifUtilsAPI,
    senderDeviceDescriptor,
    rawMessageInfos,
    userID,
    threadInfos,
    subscriptions,
    userInfos,
    getENSNames,
    getFCNames,
    devicesByPlatform,
  } = inputData;

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
    promises.push(
      buildNotifsForPlatform({
        platform: 'ios',
        encryptedNotifUtilsAPI,
        notifCreatorCallback: createAPNsVisualNotification,
        transformInputBase: (inputBase, platformDetails) => ({
          ...inputBase,
          newRawMessageInfos: shimUnsupportedRawMessageInfos(
            newRawMessageInfos,
            platformDetails,
          ),
          platformDetails,
        }),
        notifCreatorInputBase: {
          senderDeviceDescriptor,
          notifTexts,
          threadID,
          collapseKey: undefined,
          badgeOnly,
          uniqueID: uuidv4(),
        },
        versionToDevices: iosVersionToDevices,
      }),
    );
  }

  const androidVersionToDevices = devicesByPlatform.get('android');
  if (androidVersionToDevices) {
    promises.push(
      buildNotifsForPlatform({
        platform: 'android',
        encryptedNotifUtilsAPI,
        notifCreatorCallback: createAndroidVisualNotification,
        transformInputBase: (inputBase, platformDetails) => ({
          ...inputBase,
          newRawMessageInfos: shimUnsupportedRawMessageInfos(
            newRawMessageInfos,
            platformDetails,
          ),
          platformDetails,
        }),
        notifCreatorInputBase: {
          senderDeviceDescriptor,
          notifTexts,
          threadID,
          collapseKey: undefined,
          badgeOnly,
          notifID: uuidv4(),
        },
        versionToDevices: androidVersionToDevices,
      }),
    );
  }

  const macosVersionToDevices = devicesByPlatform.get('macos');
  if (macosVersionToDevices) {
    promises.push(
      buildNotifsForPlatform({
        platform: 'macos',
        encryptedNotifUtilsAPI,
        notifCreatorCallback: createAPNsVisualNotification,
        transformInputBase: (inputBase, platformDetails) => ({
          ...inputBase,
          newRawMessageInfos: shimUnsupportedRawMessageInfos(
            newRawMessageInfos,
            platformDetails,
          ),
          platformDetails,
        }),
        notifCreatorInputBase: {
          senderDeviceDescriptor,
          notifTexts,
          threadID,
          collapseKey: undefined,
          badgeOnly,
          uniqueID: uuidv4(),
        },
        versionToDevices: macosVersionToDevices,
      }),
    );
  }

  const windowsVersionToDevices = devicesByPlatform.get('windows');
  if (windowsVersionToDevices) {
    promises.push(
      buildNotifsForPlatform({
        platform: 'windows',
        encryptedNotifUtilsAPI,
        notifCreatorCallback: createWNSNotification,
        notifCreatorInputBase: {
          senderDeviceDescriptor,
          notifTexts,
          threadID,
        },
        transformInputBase: (inputBase, platformDetails) => ({
          ...inputBase,
          platformDetails,
        }),
        versionToDevices: windowsVersionToDevices,
      }),
    );
  }

  const webVersionToDevices = devicesByPlatform.get('web');
  if (webVersionToDevices) {
    promises.push(
      buildNotifsForPlatform({
        platform: 'web',
        encryptedNotifUtilsAPI,
        notifCreatorCallback: createWebNotification,
        notifCreatorInputBase: {
          senderDeviceDescriptor,
          notifTexts,
          threadID,
          id: uuidv4(),
        },
        transformInputBase: (inputBase, platformDetails) => ({
          ...inputBase,
          platformDetails,
        }),
        versionToDevices: webVersionToDevices,
      }),
    );
  }

  return (await Promise.all(promises)).flat();
}

async function buildRescindsForOwnDevices(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  devicesByPlatform: $ReadOnlyMap<
    Platform,
    $ReadOnlyMap<string, $ReadOnlyArray<NotificationTargetDevice>>,
  >,
  rescindData: { +threadID: string },
): Promise<$ReadOnlyArray<TargetedNotificationWithPlatform>> {
  const { threadID } = rescindData;
  const promises: Array<
    Promise<$ReadOnlyArray<TargetedNotificationWithPlatform>>,
  > = [];

  const iosVersionToDevices = devicesByPlatform.get('ios');
  if (iosVersionToDevices) {
    promises.push(
      buildNotifsForPlatform({
        platform: 'ios',
        encryptedNotifUtilsAPI,
        notifCreatorCallback: createAPNsNotificationRescind,
        notifCreatorInputBase: {
          senderDeviceDescriptor,
          threadID,
        },
        transformInputBase: (inputBase, platformDetails) => ({
          ...inputBase,
          platformDetails,
        }),
        versionToDevices: iosVersionToDevices,
      }),
    );
  }

  const androidVersionToDevices = devicesByPlatform.get('android');
  if (androidVersionToDevices) {
    promises.push(
      buildNotifsForPlatform({
        platform: 'android',
        encryptedNotifUtilsAPI,
        notifCreatorCallback: createAndroidNotificationRescind,
        notifCreatorInputBase: {
          senderDeviceDescriptor,
          threadID,
        },
        transformInputBase: (inputBase, platformDetails) => ({
          ...inputBase,
          platformDetails,
        }),
        versionToDevices: androidVersionToDevices,
      }),
    );
  }
  return (await Promise.all(promises)).flat();
}

async function buildBadgeUpdatesForOwnDevices(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  devicesByPlatform: $ReadOnlyMap<
    Platform,
    $ReadOnlyMap<string, $ReadOnlyArray<NotificationTargetDevice>>,
  >,
  badgeUpdateData: { +threadID: string },
): Promise<$ReadOnlyArray<TargetedNotificationWithPlatform>> {
  const { threadID } = badgeUpdateData;
  const promises: Array<
    Promise<$ReadOnlyArray<TargetedNotificationWithPlatform>>,
  > = [];

  const iosVersionToDevices = devicesByPlatform.get('ios');
  if (iosVersionToDevices) {
    promises.push(
      buildNotifsForPlatform({
        platform: 'ios',
        encryptedNotifUtilsAPI,
        notifCreatorCallback: createAPNsBadgeOnlyNotification,
        notifCreatorInputBase: {
          senderDeviceDescriptor,
          threadID,
        },
        transformInputBase: (inputBase, platformDetails) => ({
          ...inputBase,
          platformDetails,
        }),
        versionToDevices: iosVersionToDevices,
      }),
    );
  }

  const androidVersionToDevices = devicesByPlatform.get('android');
  if (androidVersionToDevices) {
    promises.push(
      buildNotifsForPlatform({
        platform: 'android',
        encryptedNotifUtilsAPI,
        notifCreatorCallback: createAndroidBadgeOnlyNotification,
        notifCreatorInputBase: {
          senderDeviceDescriptor,
          threadID,
        },
        transformInputBase: (inputBase, platformDetails) => ({
          ...inputBase,
          platformDetails,
        }),
        versionToDevices: androidVersionToDevices,
      }),
    );
  }

  const macosVersionToDevices = devicesByPlatform.get('macos');
  if (macosVersionToDevices) {
    promises.push(
      buildNotifsForPlatform({
        platform: 'macos',
        encryptedNotifUtilsAPI,
        notifCreatorCallback: createAPNsBadgeOnlyNotification,
        notifCreatorInputBase: {
          senderDeviceDescriptor,
          threadID,
        },
        transformInputBase: (inputBase, platformDetails) => ({
          ...inputBase,
          platformDetails,
        }),
        versionToDevices: macosVersionToDevices,
      }),
    );
  }
  return (await Promise.all(promises)).flat();
}

export type PerUserTargetedNotifications = {
  +[userID: string]: $ReadOnlyArray<TargetedNotificationWithPlatform>,
};

type BuildNotifsFromPushInfoInputData = {
  +encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  +senderDeviceDescriptor: SenderDeviceDescriptor,
  +pushInfo: PushInfo,
  +thickRawThreadInfos: ThickRawThreadInfos,
  +userInfos: UserInfos,
  +getENSNames: ?GetENSNames,
  +getFCNames: ?GetFCNames,
};

async function buildNotifsFromPushInfo(
  inputData: BuildNotifsFromPushInfoInputData,
): Promise<PerUserTargetedNotifications> {
  const {
    encryptedNotifUtilsAPI,
    senderDeviceDescriptor,
    pushInfo,
    thickRawThreadInfos,
    userInfos,
    getENSNames,
    getFCNames,
  } = inputData;
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

  const { usersToCollapsableNotifInfo, usersToCollapseKeysToInfo } =
    pushInfoToCollapsableNotifInfo(pushInfo);
  const mergedUsersToCollapsableInfo = mergeUserToCollapsableInfo(
    usersToCollapseKeysToInfo,
    usersToCollapsableNotifInfo,
  );

  for (const userID in mergedUsersToCollapsableInfo) {
    const threadInfos = Object.fromEntries(
      [...threadIDs].map(threadID => [
        threadID,
        threadInfoFromRawThreadInfo(
          thickRawThreadInfos[threadID],
          userID,
          userInfos,
        ),
      ]),
    );
    const devicesByPlatform = getDevicesByPlatform(pushInfo[userID].devices);
    const singleNotificationPromises = [];

    for (const notifInfo of mergedUsersToCollapsableInfo[userID]) {
      singleNotificationPromises.push(
        // We always pass one element array here
        // because coalescing is not supported for
        // notifications generated on the client
        buildNotifsForUserDevices({
          encryptedNotifUtilsAPI,
          senderDeviceDescriptor,
          rawMessageInfos: notifInfo.newMessageInfos,
          userID,
          threadInfos,
          subscriptions: pushInfo[userID].subscriptions,
          userInfos,
          getENSNames,
          getFCNames,
          devicesByPlatform,
        }),
      );
    }

    perUserBuildNotifsResultPromises[userID] = (async () => {
      const singleNotificationResults = await Promise.all(
        singleNotificationPromises,
      );
      return singleNotificationResults.filter(Boolean).flat();
    })();
  }

  return promiseAll(perUserBuildNotifsResultPromises);
}

async function createOlmSessionWithDevices(
  userDevices: {
    +[userID: string]: $ReadOnlyArray<string>,
  },
  olmSessionCreator: (
    userID: string,
    devices: $ReadOnlyArray<DeviceSessionCreationRequest>,
  ) => Promise<void>,
): Promise<void> {
  const {
    initializeCryptoAccount,
    isNotificationsSessionInitializedWithDevices,
  } = getConfig().olmAPI;
  await initializeCryptoAccount();

  const deviceIDsToSessionPresence =
    await isNotificationsSessionInitializedWithDevices(
      values(userDevices).flat(),
    );

  const olmSessionCreationPromises = [];
  for (const userID in userDevices) {
    const devices = userDevices[userID]
      .filter(deviceID => !deviceIDsToSessionPresence[deviceID])
      .map(deviceID => ({
        deviceID,
      }));

    olmSessionCreationPromises.push(olmSessionCreator(userID, devices));
  }

  try {
    await Promise.allSettled(olmSessionCreationPromises);
  } catch (e) {
    // session creation may fail for some devices
    // but we should still pursue notification
    // delivery for others
    console.log(e);
  }
}

function filterDevicesSupportingDMNotifs<
  T: { +devices: $ReadOnlyArray<Device>, ... },
>(devicesContainer: T): T {
  return {
    ...devicesContainer,
    devices: devicesContainer.devices.filter(({ platformDetails }) =>
      hasMinCodeVersion(platformDetails, {
        native: 393,
        web: 115,
        majorDesktop: 14,
      }),
    ),
  };
}

function filterDevicesSupportingDMNotifsForUsers<
  T: { +devices: $ReadOnlyArray<Device>, ... },
>(userToDevicesContainer: { +[userID: string]: T }): { +[userID: string]: T } {
  const result: { [userID: string]: T } = {};
  for (const userID in userToDevicesContainer) {
    const devicesContainer = userToDevicesContainer[userID];
    const filteredDevicesContainer =
      filterDevicesSupportingDMNotifs(devicesContainer);
    if (filteredDevicesContainer.devices.length === 0) {
      continue;
    }
    result[userID] = filteredDevicesContainer;
  }

  return result;
}

type PreparePushNotifsInputData = {
  +encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  +senderDeviceDescriptor: SenderDeviceDescriptor,
  +olmSessionCreator: (
    userID: string,
    devices: $ReadOnlyArray<DeviceSessionCreationRequest>,
  ) => Promise<void>,
  +messageInfos: { +[id: string]: RawMessageInfo },
  +thickRawThreadInfos: ThickRawThreadInfos,
  +auxUserInfos: AuxUserInfos,
  +messageDatasWithMessageInfos: ?$ReadOnlyArray<{
    +messageData: MessageData,
    +rawMessageInfo: RawMessageInfo,
  }>,
  +userInfos: UserInfos,
  +getENSNames: ?GetENSNames,
  +getFCNames: ?GetFCNames,
};

async function preparePushNotifs(
  inputData: PreparePushNotifsInputData,
): Promise<?PerUserTargetedNotifications> {
  const {
    encryptedNotifUtilsAPI,
    senderDeviceDescriptor,
    olmSessionCreator,
    messageDatasWithMessageInfos,
    messageInfos,
    auxUserInfos,
    thickRawThreadInfos,
    userInfos,
    getENSNames,
    getFCNames,
  } = inputData;

  const { pushInfos } = await getPushUserInfo(
    messageInfos,
    thickRawThreadInfos,
    auxUserInfos,
    messageDatasWithMessageInfos,
  );

  if (!pushInfos) {
    return null;
  }

  const filteredPushInfos = filterDevicesSupportingDMNotifsForUsers(pushInfos);

  const userDevices: {
    [userID: string]: $ReadOnlyArray<string>,
  } = {};
  for (const userID in filteredPushInfos) {
    userDevices[userID] = filteredPushInfos[userID].devices.map(
      device => device.cryptoID,
    );
  }

  await createOlmSessionWithDevices(userDevices, olmSessionCreator);

  return await buildNotifsFromPushInfo({
    encryptedNotifUtilsAPI,
    senderDeviceDescriptor,
    pushInfo: filteredPushInfos,
    thickRawThreadInfos,
    userInfos,
    getENSNames,
    getFCNames,
  });
}

type PrepareOwnDevicesPushNotifsInputData = {
  +encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  +senderInfo: SenderInfo,
  +olmSessionCreator: (
    userID: string,
    devices: $ReadOnlyArray<DeviceSessionCreationRequest>,
  ) => Promise<void>,
  +auxUserInfos: AuxUserInfos,
  +rescindData?: { threadID: string },
  +badgeUpdateData?: { threadID: string },
};

async function prepareOwnDevicesPushNotifs(
  inputData: PrepareOwnDevicesPushNotifsInputData,
): Promise<?$ReadOnlyArray<TargetedNotificationWithPlatform>> {
  const {
    encryptedNotifUtilsAPI,
    senderInfo,
    olmSessionCreator,
    auxUserInfos,
    rescindData,
    badgeUpdateData,
  } = inputData;

  const ownDevicesPushInfo = getOwnDevicesPushInfo(senderInfo, auxUserInfos);

  if (!ownDevicesPushInfo) {
    return null;
  }

  const filteredownDevicesPushInfos =
    filterDevicesSupportingDMNotifs(ownDevicesPushInfo);

  const { senderUserID, senderDeviceDescriptor } = senderInfo;

  const userDevices: {
    +[userID: string]: $ReadOnlyArray<string>,
  } = {
    [senderUserID]: filteredownDevicesPushInfos.devices.map(
      device => device.cryptoID,
    ),
  };

  await createOlmSessionWithDevices(userDevices, olmSessionCreator);
  const devicesByPlatform = getDevicesByPlatform(
    filteredownDevicesPushInfos.devices,
  );

  if (rescindData) {
    return await buildRescindsForOwnDevices(
      encryptedNotifUtilsAPI,
      senderDeviceDescriptor,
      devicesByPlatform,
      rescindData,
    );
  } else if (badgeUpdateData) {
    return await buildBadgeUpdatesForOwnDevices(
      encryptedNotifUtilsAPI,
      senderDeviceDescriptor,
      devicesByPlatform,
      badgeUpdateData,
    );
  } else {
    return null;
  }
}

export {
  preparePushNotifs,
  prepareOwnDevicesPushNotifs,
  generateNotifUserInfoPromise,
  pushInfoToCollapsableNotifInfo,
  mergeUserToCollapsableInfo,
};
