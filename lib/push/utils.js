// @flow

import invariant from 'invariant';

import type { Device } from './send-utils.js';
import { type PushType } from '../shared/messages/message-spec.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import type { Platform } from '../types/device-types.js';
import {
  type MessageData,
  type RawMessageInfo,
} from '../types/message-types.js';
import type { NotificationTargetDevice } from '../types/notif-types.js';

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
  +pushType: PushType,
  +devices: $ReadOnlyArray<Device>,
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +messageDatas: $ReadOnlyArray<MessageData>,
  +threadsToMessageIndices: $ReadOnlyMap<string, number[]>,
  +threadIDs: $ReadOnlySet<string>,
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
    pushType,
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
        const { generatesNotifs } = messageSpecs[type];

        if (!generatesNotifs) {
          return undefined;
        }

        const messageData = messageDatas[messageIndex];
        const doesGenerateNotif = await generatesNotifs(
          messageInfo,
          messageData,
          {
            notifTargetUserID: userID,
            userNotMemberOfSubthreads,
            fetchMessageInfoByID,
          },
        );

        return doesGenerateNotif === pushType
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

export {
  stringToVersionKey,
  versionKeyToString,
  getDevicesByPlatform,
  generateNotifUserInfoPromise,
};
