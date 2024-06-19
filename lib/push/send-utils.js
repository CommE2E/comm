// @flow

import _pickBy from 'lodash/fp/pickBy.js';
import uuidv4 from 'uuid/v4.js';

import { generateNotifUserInfoPromise } from './utils.js';
import { hasPermission } from '../permissions/minimally-encoded-thread-permissions.js';
import {
  rawMessageInfoFromMessageData,
  createMessageInfo,
} from '../shared/message-utils.js';
import { pushTypes } from '../shared/messages/message-spec.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import { notifTextsForMessageInfo } from '../shared/notif-utils.js';
import {
  isMemberActive,
  threadInfoFromRawThreadInfo,
} from '../shared/thread-utils.js';
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
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { ResolvedNotifTexts } from '../types/notif-types.js';
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
        !hasPermission(memberInfo.permissions, 'visible') ||
        !memberInfo.subscription
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

    userPushInfoPromises[userID] = generateNotifUserInfoPromise({
      pushType: pushTypes.NOTIF,
      devices: pushUserThreadInfo.devices,
      newMessageInfos,
      messageDatas,
      threadsToMessageIndices,
      threadIDs: pushUserThreadInfo.threadIDs,
      userNotMemberOfSubthreads: new Set(),
      fetchMessageInfoByID: (messageID: string) =>
        (async () => messageInfos[messageID])(),
      userID,
    });
    userRescindInfoPromises[userID] = generateNotifUserInfoPromise({
      pushType: pushTypes.RESCIND,
      devices: pushUserThreadInfo.devices,
      newMessageInfos,
      messageDatas,
      threadsToMessageIndices,
      threadIDs: pushUserThreadInfo.threadIDs,
      userNotMemberOfSubthreads: new Set(),
      fetchMessageInfoByID: (messageID: string) =>
        (async () => messageInfos[messageID])(),
      userID,
    });
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
  inputData: {
    +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
    +userID: string,
    +threadInfos: { +[id: string]: ThreadInfo },
    +userInfos: UserInfos,
  },
  getENSNames: ?GetENSNames,
  getFCNames: ?GetFCNames,
): Promise<?{
  +notifTexts: ResolvedNotifTexts,
  +newRawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
}> {
  const { rawMessageInfos, userID, threadInfos, userInfos } = inputData;
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

  return { notifTexts, newRawMessageInfos };
}

export type PerUserNotifBuildResult = {
  +[userID: string]: $ReadOnlyArray<{
    +notifTexts: ResolvedNotifTexts,
    +newRawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  }>,
};

async function buildNotifsTexts(
  pushInfo: PushInfo,
  rawThreadInfos: RawThreadInfos,
  userInfos: UserInfos,
  getENSNames: ?GetENSNames,
  getFCNames: ?GetFCNames,
): Promise<PerUserNotifBuildResult> {
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

  const perUserNotifTextsPromises: {
    [userID: string]: Promise<
      Array<?{
        +notifTexts: ResolvedNotifTexts,
        +newRawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
      }>,
    >,
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

    const userNotifTextsPromises = [];

    for (const rawMessageInfos of pushInfo[userID].messageInfos) {
      userNotifTextsPromises.push(
        buildNotifText(
          {
            // We always pass one element array here
            // because coalescing is not supported for
            // notifications generated on the client
            rawMessageInfos: [rawMessageInfos],
            threadInfos,
            userID,
            userInfos,
          },
          getENSNames,
          getFCNames,
        ),
      );
    }

    perUserNotifTextsPromises[userID] = Promise.all(userNotifTextsPromises);
  }

  const perUserNotifTexts = await promiseAll(perUserNotifTextsPromises);
  const filteredPerUserNotifTexts: { ...PerUserNotifBuildResult } = {};

  for (const userID in perUserNotifTexts) {
    filteredPerUserNotifTexts[userID] =
      perUserNotifTexts[userID].filter(Boolean);
  }
  return filteredPerUserNotifTexts;
}

type PreparePushNotifsInputData = {
  +messageInfos: { +[id: string]: RawMessageInfo },
  +rawThreadInfos: RawThreadInfos,
  +auxUserInfos: AuxUserInfos,
  +messageDatas: $ReadOnlyArray<MessageData>,
  +userInfos: UserInfos,
  +getENSNames: ?GetENSNames,
  +getFCNames: ?GetFCNames,
};

async function preparePushNotifs(
  inputData: PreparePushNotifsInputData,
): Promise<?PerUserNotifBuildResult> {
  const {
    messageDatas,
    messageInfos,
    auxUserInfos,
    rawThreadInfos,
    userInfos,
    getENSNames,
    getFCNames,
  } = inputData;

  const { pushInfos } = await getPushUserInfo(
    messageInfos,
    rawThreadInfos,
    auxUserInfos,
    messageDatas,
  );

  if (!pushInfos) {
    return null;
  }

  return await buildNotifsTexts(
    pushInfos,
    rawThreadInfos,
    userInfos,
    getENSNames,
    getFCNames,
  );
}

export { preparePushNotifs, generateNotifUserInfoPromise };
