// @flow

import type { RawMessageInfo, MessageInfo } from 'lib/types/message-types';
import type { UserInfos } from 'lib/types/user-types';
import type { ServerThreadInfo, ThreadInfo } from 'lib/types/thread-types';
import type { DeviceType } from 'lib/types/device-types';
import type {
  CollapsableNotifInfo,
  FetchCollapsableNotifsResult,
} from '../fetchers/message-fetchers';

import apn from 'apn';
import invariant from 'invariant';
import uuidv4 from 'uuid/v4';
import _flow from 'lodash/fp/flow';
import _mapValues from 'lodash/fp/mapValues';
import _pickBy from 'lodash/fp/pickBy';

import { notifTextForMessageInfo } from 'lib/shared/notif-utils';
import { messageType } from 'lib/types/message-types';
import {
  createMessageInfo,
  sortMessageInfoList,
} from 'lib/shared/message-utils';
import {
  rawThreadInfoFromServerThreadInfo,
  threadInfoFromRawThreadInfo,
} from 'lib/shared/thread-utils';

import { dbQuery, SQL, mergeOrConditions } from '../database';
import { apnPush, fcmPush, getUnreadCounts } from './utils';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers';
import { fetchUserInfos } from '../fetchers/user-fetchers';
import { fetchCollapsableNotifs } from '../fetchers/message-fetchers';
import createIDs from '../creators/id-creator';

type Device = { deviceType: DeviceType, deviceToken: string };
type PushUserInfo = {
  devices: Device[],
  messageInfos: RawMessageInfo[],
};
export type PushInfo = { [userID: string]: PushUserInfo };

async function sendPushNotifs(pushInfo: PushInfo) {
  if (Object.keys(pushInfo).length === 0) {
    return [];
  }

  const [
    unreadCounts,
    { usersToCollapsableNotifInfo, serverThreadInfos, userInfos },
    dbIDs,
  ] = await Promise.all([
    getUnreadCounts(Object.keys(pushInfo)),
    fetchInfos(pushInfo),
    createDBIDs(pushInfo),
  ]);

  const deliveryPromises = [];
  const notifications = {};
  for (let userID in usersToCollapsableNotifInfo) {
    const threadInfos = _flow(
      _mapValues(
        (serverThreadInfo: ServerThreadInfo) => {
          const rawThreadInfo = rawThreadInfoFromServerThreadInfo(
            serverThreadInfo,
            userID,
          );
          if (!rawThreadInfo) {
            return null;
          }
          return threadInfoFromRawThreadInfo(
            rawThreadInfo,
            userID,
            userInfos,
          );
        },
      ),
      _pickBy(threadInfo => threadInfo),
    )(serverThreadInfos);
    for (let notifInfo of usersToCollapsableNotifInfo[userID]) {
      const hydrateMessageInfo =
        (rawMessageInfo: RawMessageInfo) => createMessageInfo(
          rawMessageInfo,
          userID,
          userInfos,
          threadInfos,
        );
      const newMessageInfos = [];
      const newRawMessageInfos = [];
      for (let newRawMessageInfo of notifInfo.newMessageInfos) {
        const newMessageInfo = hydrateMessageInfo(newRawMessageInfo);
        if (newMessageInfo) {
          newMessageInfos.push(newMessageInfo);
          newRawMessageInfos.push(newRawMessageInfo);
        }
      }
      if (newMessageInfos.length === 0) {
        continue;
      }
      const existingMessageInfos = notifInfo.existingMessageInfos.map(
        hydrateMessageInfo,
      ).filter(Boolean);
      const allMessageInfos = sortMessageInfoList(
        [ ...newMessageInfos, ...existingMessageInfos ],
      );
      const [ firstNewMessageInfo, ...remainingNewMessageInfos ] =
        newMessageInfos;
      const threadID = firstNewMessageInfo.threadID;

      const threadInfo = threadInfos[threadID];
      const badgeOnly = !threadInfo.currentUser.subscription.pushNotifs;
      if (badgeOnly && !threadInfo.currentUser.subscription.home) {
        continue;
      }

      const dbID = dbIDs.shift();
      invariant(dbID, "should have sufficient DB IDs");
      const byDeviceType = getDevicesByDeviceType(pushInfo[userID].devices);
      const delivery = {};
      if (byDeviceType.ios) {
        const notification = prepareIOSNotification(
          allMessageInfos,
          newRawMessageInfos,
          threadInfo,
          notifInfo.collapseKey,
          badgeOnly,
          unreadCounts[userID],
        );
        deliveryPromises.push(apnPush(notification, byDeviceType.ios, dbID));
        delivery.iosDeviceTokens = byDeviceType.ios;
        delivery.iosID = notification.id;
      }
      if (byDeviceType.android) {
        const notification = prepareAndroidNotification(
          allMessageInfos,
          newRawMessageInfos,
          threadInfo,
          notifInfo.collapseKey,
          badgeOnly,
          unreadCounts[userID],
          dbID,
        );
        deliveryPromises.push(fcmPush(
          notification,
          byDeviceType.android,
          notifInfo.collapseKey,
          dbID,
        ));
        delivery.androidDeviceTokens = byDeviceType.android;
      }

      notifications[dbID] = [
        dbID,
        userID,
        threadID,
        firstNewMessageInfo.id,
        notifInfo.collapseKey,
        delivery,
        0,
      ];
      for (let newMessageInfo of remainingNewMessageInfos) {
        const newDBID = dbIDs.shift();
        invariant(newDBID, "should have sufficient DB IDs");
        notifications[newDBID] = [
          newDBID,
          userID,
          newMessageInfo.threadID,
          newMessageInfo.id,
          notifInfo.collapseKey,
          { collapsedInto: dbID },
          0,
        ];
      }
    }
  }

  const cleanUpPromises = [];
  if (dbIDs.length > 0) {
    const query = SQL`DELETE FROM ids WHERE id IN (${dbIDs})`;
    cleanUpPromises.push(dbQuery(query));
  }
  const [ deliveryResults ] = await Promise.all([
    Promise.all(deliveryPromises),
    Promise.all(cleanUpPromises),
  ]);

  const invalidTokens = [];
  for (let deliveryResult of deliveryResults) {
    if (deliveryResult.errors) {
      notifications[deliveryResult.dbID][5].errors = deliveryResult.errors;
    }
    if (deliveryResult.fcmIDs) {
      notifications[deliveryResult.dbID][5].androidID =
        deliveryResult.fcmIDs[0];
    }
    if (deliveryResult.invalidFCMTokens) {
      invalidTokens.push({
        userID: notifications[deliveryResult.dbID][1],
        fcmTokens: deliveryResult.invalidFCMTokens,
      });
    }
    if (deliveryResult.invalidAPNTokens) {
      invalidTokens.push({
        userID: notifications[deliveryResult.dbID][1],
        apnTokens: deliveryResult.invalidAPNTokens,
      });
    }
  }

  const dbPromises = [];
  if (invalidTokens.length > 0) {
    dbPromises.push(removeInvalidTokens(invalidTokens));
  }

  const flattenedNotifications = [];
  for (let dbID in notifications) {
    const notification = notifications[dbID];
    const jsonConverted = [...notification];
    jsonConverted[5] = JSON.stringify(jsonConverted[5]);
    flattenedNotifications.push(jsonConverted);
  }
  if (flattenedNotifications.length > 0) {
    const query = SQL`
      INSERT INTO notifications
        (id, user, thread, message, collapse_key, delivery, rescinded)
      VALUES ${flattenedNotifications}
    `;
    dbPromises.push(dbQuery(query));
  }
  if (dbPromises.length > 0) {
    await Promise.all(dbPromises);
  }
}

async function fetchInfos(pushInfo: PushInfo) {
  const collapsableNotifsResult = await fetchCollapsableNotifs(pushInfo);

  const threadIDs = new Set();
  const addThreadIDsFromMessageInfos = (rawMessageInfo: RawMessageInfo) => {
    threadIDs.add(rawMessageInfo.threadID);
    if (
      rawMessageInfo.type === messageType.CREATE_THREAD &&
      rawMessageInfo.initialThreadState.parentThreadID
    ) {
      threadIDs.add(rawMessageInfo.initialThreadState.parentThreadID);
    } else if (rawMessageInfo.type === messageType.CREATE_SUB_THREAD) {
      threadIDs.add(rawMessageInfo.childThreadID);
    }
  };
  const usersToCollapsableNotifInfo =
    collapsableNotifsResult.usersToCollapsableNotifInfo;
  for (let userID in usersToCollapsableNotifInfo) {
    for (let notifInfo of usersToCollapsableNotifInfo[userID]) {
      for (let rawMessageInfo of notifInfo.existingMessageInfos) {
        addThreadIDsFromMessageInfos(rawMessageInfo);
      }
      for (let rawMessageInfo of notifInfo.newMessageInfos) {
        addThreadIDsFromMessageInfos(rawMessageInfo);
      }
    }
  }

  // These threadInfos won't have currentUser set
  const { threadInfos: serverThreadInfos, userInfos: threadUserInfos } =
    await fetchServerThreadInfos(SQL`t.id IN (${[...threadIDs]})`);
  const mergedUserInfos = {
    ...collapsableNotifsResult.userInfos,
    ...threadUserInfos,
  };

  const userInfos = await fetchMissingUserInfos(
    mergedUserInfos,
    usersToCollapsableNotifInfo,
  );

  return { usersToCollapsableNotifInfo, serverThreadInfos, userInfos };
}

async function fetchMissingUserInfos(
  userInfos: UserInfos,
  usersToCollapsableNotifInfo: { [userID: string]: CollapsableNotifInfo[] },
) {
  const missingUserIDs = new Set();
  const addIfMissing = (userID: string) => {
    if (!userInfos[userID]) {
      missingUserIDs.add(userID);
    }
  };
  const addUserIDsFromMessageInfos = (rawMessageInfo: RawMessageInfo) => {
    addIfMissing(rawMessageInfo.creatorID);
    if (rawMessageInfo.type === messageType.ADD_MEMBERS) {
      for (let userID of rawMessageInfo.addedUserIDs) {
        addIfMissing(userID);
      }
    } else if (rawMessageInfo.type === messageType.REMOVE_MEMBERS) {
      for (let userID of rawMessageInfo.removedUserIDs) {
        addIfMissing(userID);
      }
    } else if (rawMessageInfo.type === messageType.CREATE_THREAD) {
      for (let userID of rawMessageInfo.initialThreadState.memberIDs) {
        addIfMissing(userID);
      }
    }
  };

  for (let userID in usersToCollapsableNotifInfo) {
    for (let notifInfo of usersToCollapsableNotifInfo[userID]) {
      for (let rawMessageInfo of notifInfo.existingMessageInfos) {
        addUserIDsFromMessageInfos(rawMessageInfo);
      }
      for (let rawMessageInfo of notifInfo.newMessageInfos) {
        addUserIDsFromMessageInfos(rawMessageInfo);
      }
    }
  }

  let finalUserInfos = userInfos;
  if (missingUserIDs.size > 0) {
    const newUserInfos = await fetchUserInfos([...missingUserIDs]);
    finalUserInfos = { ...userInfos, ...newUserInfos };
  }
  return finalUserInfos;
}

async function createDBIDs(pushInfo: PushInfo): Promise<string[]> {
  let numIDsNeeded = 0;
  for (let userID in pushInfo) {
    numIDsNeeded += pushInfo[userID].messageInfos.length;
  }
  return await createIDs("notifications", numIDsNeeded);
}

function getDevicesByDeviceType(
  devices: Device[],
): { [deviceType: DeviceType]: string[] } {
  const byDeviceType = {};
  for (let device of devices) {
    if (!byDeviceType[device.deviceType]) {
      byDeviceType[device.deviceType] = [];
    }
    byDeviceType[device.deviceType].push(device.deviceToken);
  }
  return byDeviceType;
}

function prepareIOSNotification(
  allMessageInfos: MessageInfo[],
  newRawMessageInfos: RawMessageInfo[],
  threadInfo: ThreadInfo,
  collapseKey: ?string,
  badgeOnly: bool,
  unreadCount: number,
): apn.Notification {
  const uniqueID = uuidv4();
  const notification = new apn.Notification();
  notification.topic = "org.squadcal.app";
  if (!badgeOnly) {
    const notifText = notifTextForMessageInfo(allMessageInfos, threadInfo);
    notification.body = notifText;
    notification.sound = "default";
  }
  notification.badge = unreadCount;
  notification.threadId = threadInfo.id;
  notification.id = uniqueID;
  notification.payload.id = uniqueID;
  notification.payload.threadID = threadInfo.id;
  notification.payload.messageInfos = JSON.stringify(newRawMessageInfos);
  if (collapseKey) {
    notification.collapseId = collapseKey;
  }
  return notification;
}

function prepareAndroidNotification(
  allMessageInfos: MessageInfo[],
  newRawMessageInfos: RawMessageInfo[],
  threadInfo: ThreadInfo,
  collapseKey: ?string,
  badgeOnly: bool,
  unreadCount: number,
  dbID: string,
): Object {
  const notifID = collapseKey ? collapseKey : dbID;
  if (badgeOnly) {
    return {
      data: {
        badge: unreadCount.toString(),
        messageInfos: JSON.stringify(newRawMessageInfos),
        notifID,
      },
    };
  }
  return {
    data: {
      badge: unreadCount.toString(),
      custom_notification: JSON.stringify({
        body: notifTextForMessageInfo(allMessageInfos, threadInfo),
        badgeCount: unreadCount, // TODO: remove this
        id: notifID,
        priority: "high",
        sound: "default",
        icon: "notif_icon",
        threadID: threadInfo.id,
        messageInfos: JSON.stringify(newRawMessageInfos),
        click_action: "fcm.ACTION.HELLO",
      }),
    }
  };
}

type InvalidToken = {
  userID: string,
  fcmTokens?: string[],
  apnTokens?: string[],
};
async function removeInvalidTokens(invalidTokens: InvalidToken[]) {
  const query = SQL`
    UPDATE cookies
    SET android_device_token = NULL, ios_device_token = NULL
    WHERE
  `;

  const sqlTuples = [];
  for (let invalidTokenUser of invalidTokens) {
    const deviceConditions = [];
    if (invalidTokenUser.fcmTokens && invalidTokenUser.fcmTokens.length > 0) {
      deviceConditions.push(
        SQL`android_device_token IN (${invalidTokenUser.fcmTokens})`,
      );
    }
    if (invalidTokenUser.apnTokens && invalidTokenUser.apnTokens.length > 0) {
      deviceConditions.push(
        SQL`ios_device_token IN (${invalidTokenUser.apnTokens})`,
      );
    }
    const statement = SQL`(user = ${invalidTokenUser.userID} AND `;
    statement.append(mergeOrConditions(deviceConditions)).append(SQL`)`);
    sqlTuples.push(statement);
  }
  query.append(mergeOrConditions(sqlTuples));

  await dbQuery(query);
}

export {
  sendPushNotifs,
};
