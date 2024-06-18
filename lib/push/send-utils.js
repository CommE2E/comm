// @flow

import invariant from 'invariant';
import _pickBy from 'lodash/fp/pickBy.js';
import uuidv4 from 'uuid/v4.js';

import { hasPermission } from '../permissions/minimally-encoded-thread-permissions.js';
import { rawMessageInfoFromMessageData } from '../shared/message-utils.js';
import { type PushType, pushTypes } from '../shared/messages/message-spec.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import { isMemberActive } from '../shared/thread-utils.js';
import type { AuxUserInfos } from '../types/aux-user-types.js';
import type { PlatformDetails } from '../types/device-types.js';
import {
  identityDeviceTypeToPlatform,
  type IdentityPlatformDetails,
} from '../types/identity-service-types.js';
import {
  type MessageData,
  type RawMessageInfo,
  messageDataLocalID,
} from '../types/message-types.js';
import type { RawThreadInfos } from '../types/thread-types.js';
import { promiseAll } from '../utils/promises.js';

type PushUserInfo = {
  +devices: $ReadOnlyArray<{
    +platformDetails: PlatformDetails,
    +deliveryID: string,
    +cryptoID: string,
  }>,
  +messageInfos: RawMessageInfo[],
  +messageDatas: MessageData[],
};

type PushInfo = { +[userID: string]: PushUserInfo };

type PushUserThreadInfo = {
  +devices: $ReadOnlyArray<{
    +platformDetails: PlatformDetails,
    +deliveryID: string,
    +cryptoID: string,
  }>,
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

    const generateNotifUserInfoPromise = async (pushType: PushType) => {
      const promises: Array<
        Promise<?{
          +messageInfo: RawMessageInfo,
          +messageData: MessageData,
        }>,
      > = [];

      for (const threadID of pushUserThreadInfo.threadIDs) {
        const messageIndices = threadsToMessageIndices.get(threadID);
        invariant(
          messageIndices,
          `indices should exist for thread ${threadID}`,
        );

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
                userNotMemberOfSubthreads: new Set(),
                fetchMessageInfoByID: (messageID: string) =>
                  (async () => messageInfos[messageID])(),
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
        devices: pushUserThreadInfo.devices,
        messageInfos: filteredMessagesToNotify.map(
          ({ messageInfo }) => messageInfo,
        ),
        messageDatas: filteredMessagesToNotify.map(
          ({ messageData }) => messageData,
        ),
      };
    };

    userPushInfoPromises[userID] = generateNotifUserInfoPromise(
      pushTypes.NOTIF,
    );
    userRescindInfoPromises[userID] = generateNotifUserInfoPromise(
      pushTypes.RESCIND,
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

export { getPushUserInfo };
