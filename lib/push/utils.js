// @flow

import invariant from 'invariant';

import type { Device, ThreadSubscriptionWithRole } from './send-utils.js';
import { oldValidUsernameRegex } from '../shared/account-utils.js';
import { isUserMentioned } from '../shared/mention-utils.js';
import { type MessageNotifyType } from '../shared/messages/message-spec.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import type { Platform } from '../types/device-types.js';
import { messageTypes } from '../types/message-types-enum.js';
import type {
  MessageData,
  RawMessageInfo,
  MessageInfo,
} from '../types/message-types.js';
import type { NotificationTargetDevice } from '../types/notif-types.js';
import type { GlobalUserInfo, UserInfo } from '../types/user-types.js';
import type { GetENSNames } from '../utils/ens-helpers.js';

export type VersionKey = {
  +codeVersion: number,
  +stateVersion: number,
  +majorDesktopVersion?: number,
};
export const versionKeyRegex: RegExp = new RegExp(/^-?\d+\|-?\d+(\|-?\d+)?$/);

function versionKeyToString(versionKey: VersionKey): string {
  const baseStringVersionKey = `${versionKey.codeVersion}|${versionKey.stateVersion}`;
  if (!versionKey.majorDesktopVersion) {
    return baseStringVersionKey;
  }
  return `${baseStringVersionKey}|${versionKey.majorDesktopVersion}`;
}

function stringToVersionKey(versionKeyString: string): VersionKey {
  invariant(
    versionKeyRegex.test(versionKeyString),
    'should pass correct version key string',
  );
  const [codeVersion, stateVersion, majorDesktopVersion] = versionKeyString
    .split('|')
    .map(Number);
  return { codeVersion, stateVersion, majorDesktopVersion };
}

function getDevicesByPlatform(
  devices: $ReadOnlyArray<Device>,
): Map<Platform, Map<string, Array<NotificationTargetDevice>>> {
  const byPlatform = new Map<
    Platform,
    Map<string, Array<NotificationTargetDevice>>,
  >();
  for (const device of devices) {
    let innerMap = byPlatform.get(device.platformDetails.platform);
    if (!innerMap) {
      innerMap = new Map<string, Array<NotificationTargetDevice>>();
      byPlatform.set(device.platformDetails.platform, innerMap);
    }
    const codeVersion: number =
      device.platformDetails.codeVersion !== null &&
      device.platformDetails.codeVersion !== undefined
        ? device.platformDetails.codeVersion
        : -1;
    const stateVersion: number = device.platformDetails.stateVersion ?? -1;

    let versionsObject = { codeVersion, stateVersion };
    if (device.platformDetails.majorDesktopVersion) {
      versionsObject = {
        ...versionsObject,
        majorDesktopVersion: device.platformDetails.majorDesktopVersion,
      };
    }

    const versionKey = versionKeyToString(versionsObject);
    let innerMostArrayTmp: ?Array<NotificationTargetDevice> =
      innerMap.get(versionKey);
    if (!innerMostArrayTmp) {
      innerMostArrayTmp = [];
      innerMap.set(versionKey, innerMostArrayTmp);
    }
    const innerMostArray = innerMostArrayTmp;

    innerMostArray.push({
      cryptoID: device.cryptoID,
      deliveryID: device.deliveryID,
    });
  }
  return byPlatform;
}

type GenerateNotifUserInfoPromiseInputData = {
  +messageNotifyType: MessageNotifyType,
  +devices: $ReadOnlyArray<Device>,
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +messageDatas: $ReadOnlyArray<MessageData>,
  +threadsToMessageIndices: $ReadOnlyMap<string, number[]>,
  +threadIDs: $ReadOnlyArray<string>,
  +userNotMemberOfSubthreads: Set<string>,
  +fetchMessageInfoByID: (messageID: string) => Promise<any>,
  +userID: string,
};

async function generateNotifUserInfoPromise(
  inputData: GenerateNotifUserInfoPromiseInputData,
): Promise<?{
  devices: $ReadOnlyArray<Device>,
  messageDatas: Array<MessageData>,
  messageInfos: Array<RawMessageInfo>,
}> {
  const {
    messageNotifyType,
    devices,
    newMessageInfos,
    messageDatas,
    threadsToMessageIndices,
    threadIDs,
    userNotMemberOfSubthreads,
    userID,
    fetchMessageInfoByID,
  } = inputData;

  const promises: Array<
    Promise<?{
      +messageInfo: RawMessageInfo,
      +messageData: MessageData,
    }>,
  > = [];

  for (const threadID of threadIDs) {
    const messageIndices = threadsToMessageIndices.get(threadID);
    invariant(messageIndices, `indices should exist for thread ${threadID}`);

    promises.push(
      ...messageIndices.map(async messageIndex => {
        const messageInfo = newMessageInfos[messageIndex];
        if (messageInfo.creatorID === userID) {
          return undefined;
        }

        const { type } = messageInfo;
        const { getMessageNotifyType } = messageSpecs[type];

        if (!getMessageNotifyType) {
          return undefined;
        }

        const messageData = messageDatas[messageIndex];
        const thisMessageNotifyType = await getMessageNotifyType(
          messageInfo,
          messageData,
          {
            notifTargetUserID: userID,
            userNotMemberOfSubthreads,
            fetchMessageInfoByID,
          },
        );

        return thisMessageNotifyType === messageNotifyType
          ? { messageInfo, messageData }
          : undefined;
      }),
    );
  }

  const messagesToNotify = await Promise.all(promises);
  const filteredMessagesToNotify = messagesToNotify.filter(Boolean);

  if (filteredMessagesToNotify.length === 0) {
    return undefined;
  }

  return {
    devices,
    messageInfos: filteredMessagesToNotify.map(
      ({ messageInfo }) => messageInfo,
    ),
    messageDatas: filteredMessagesToNotify.map(
      ({ messageData }) => messageData,
    ),
  };
}

export type UserAllowsNotifInputData = {
  +subscription: ThreadSubscriptionWithRole,
  +userID: string,
  +newMessageInfos: $ReadOnlyArray<MessageInfo>,
  +userInfos: { +[string]: UserInfo | GlobalUserInfo },
  +username: ?string,
  +getENSNames: ?GetENSNames,
};

async function userAllowsNotif(inputData: UserAllowsNotifInputData): Promise<{
  +notifAllowed: boolean,
  +badgeOnly: boolean,
}> {
  const {
    subscription,
    userID,
    newMessageInfos,
    userInfos,
    username,
    getENSNames,
  } = inputData;
  const updateBadge = subscription.home;
  const displayBanner = subscription.pushNotifs;

  let resolvedUsername;
  if (getENSNames) {
    const userInfosWithENSNames = await getENSNames([userInfos[userID]]);
    resolvedUsername = userInfosWithENSNames[0].username;
  }

  const userWasMentioned =
    username &&
    subscription.role &&
    oldValidUsernameRegex.test(username) &&
    newMessageInfos.some(newMessageInfo => {
      const unwrappedMessageInfo =
        newMessageInfo.type === messageTypes.SIDEBAR_SOURCE
          ? newMessageInfo.sourceMessage
          : newMessageInfo;
      return (
        unwrappedMessageInfo.type === messageTypes.TEXT &&
        (isUserMentioned(username, unwrappedMessageInfo.text) ||
          (resolvedUsername &&
            isUserMentioned(resolvedUsername, unwrappedMessageInfo.text)))
      );
    });

  const notifAllowed = !!updateBadge || !!displayBanner || !!userWasMentioned;
  const badgeOnly = !displayBanner && !userWasMentioned;

  return { notifAllowed, badgeOnly };
}

export {
  stringToVersionKey,
  versionKeyToString,
  getDevicesByPlatform,
  generateNotifUserInfoPromise,
  userAllowsNotif,
};
