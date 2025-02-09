// @flow

import invariant from 'invariant';

import type { Device, ThreadSubscriptionWithRole } from './send-utils.js';
import { oldValidUsernameRegex } from '../shared/account-utils.js';
import { isUserMentioned } from '../shared/mention-utils.js';
import {
  type MessageNotifyType,
  messageNotifyTypes,
} from '../shared/messages/message-spec.js';
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

type FetchMessageNotifyTypeInputData = {
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +messageDatas: $ReadOnlyArray<MessageData>,
  +threadsToMessageIndices: $ReadOnlyMap<string, number[]>,
  +userNotMemberOfSubthreads: Set<string>,
  +fetchMessageInfoByID: (messageID: string) => Promise<any>,
  +userID: string,
};
type FetchMessageNotifyTypeReturnInstance = {
  +messageNotifyType: MessageNotifyType,
  +messageInfo: RawMessageInfo,
  +messageData: MessageData,
};
async function fetchMessageNotifyType(
  inputData: FetchMessageNotifyTypeInputData,
): Promise<Map<string, Array<FetchMessageNotifyTypeReturnInstance>>> {
  const {
    newMessageInfos,
    messageDatas,
    threadsToMessageIndices,
    userNotMemberOfSubthreads,
    fetchMessageInfoByID,
    userID,
  } = inputData;

  const promises: Array<Promise<?FetchMessageNotifyTypeReturnInstance>> = [];
  for (const [, messageIndices] of threadsToMessageIndices) {
    promises.push(
      ...messageIndices.map(async messageIndex => {
        const messageInfo = newMessageInfos[messageIndex];
        if (messageInfo.creatorID === userID) {
          // We don't need to notify the message author about their message
          return undefined;
        }

        const messageData = messageDatas[messageIndex];

        const { type } = messageInfo;
        const { getMessageNotifyType } = messageSpecs[type];

        let messageNotifyType = messageNotifyTypes.SET_UNREAD;
        if (getMessageNotifyType) {
          messageNotifyType = await getMessageNotifyType(
            messageInfo,
            messageData,
            {
              notifTargetUserID: userID,
              userNotMemberOfSubthreads,
              fetchMessageInfoByID,
            },
          );
        }

        return {
          messageNotifyType,
          messageInfo,
          messageData,
        };
      }),
    );
  }
  const results = await Promise.all(promises);

  const returnMap = new Map<
    string,
    Array<FetchMessageNotifyTypeReturnInstance>,
  >();
  for (const result of results) {
    if (!result) {
      continue;
    }
    let resultsForThread = returnMap.get(result.messageInfo.threadID);
    if (!resultsForThread) {
      resultsForThread = [];
      returnMap.set(result.messageInfo.threadID, resultsForThread);
    }
    resultsForThread.push(result);
  }
  return returnMap;
}

type GenerateNotifUserInfoInputData = {
  +messageNotifyType: MessageNotifyType,
  +messages: $ReadOnlyMap<
    string,
    $ReadOnlyArray<FetchMessageNotifyTypeReturnInstance>,
  >,
  +devices: $ReadOnlyArray<Device>,
  +threadIDs: $ReadOnlyArray<string>,
};
function generateNotifUserInfo(inputData: GenerateNotifUserInfoInputData): ?{
  devices: $ReadOnlyArray<Device>,
  messageInfos: Array<RawMessageInfo>,
  messageDatas: Array<MessageData>,
} {
  const { messageNotifyType, messages, devices, threadIDs } = inputData;

  const messageInfos: Array<RawMessageInfo> = [];
  const messageDatas: Array<MessageData> = [];

  for (const threadID of threadIDs) {
    const threadMessages = messages.get(threadID);
    if (!threadMessages) {
      continue;
    }
    for (const message of threadMessages) {
      if (message.messageNotifyType !== messageNotifyType) {
        continue;
      }
      messageInfos.push(message.messageInfo);
      messageDatas.push(message.messageData);
    }
  }

  if (messageInfos.length === 0) {
    return undefined;
  }

  return { devices, messageInfos, messageDatas };
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
  fetchMessageNotifyType,
  generateNotifUserInfo,
  userAllowsNotif,
};
