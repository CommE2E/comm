// @flow

import type { $Response, $Request } from 'express';
import type { RawMessageInfo, MessageInfo } from 'lib/types/message-types';
import type { UserInfo } from 'lib/types/user-types';
import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types';
import type { Connection } from '../database';
import type { DeviceType } from 'lib/actions/device-actions';

import apn from 'apn';
import invariant from 'invariant';
import uuidv4 from 'uuid/v4';

import { notifTextForMessageInfo } from 'lib/shared/notif-utils';
import { messageType } from 'lib/types/message-types';
import { createMessageInfo } from 'lib/shared/message-utils';
import { rawThreadInfosToThreadInfos } from 'lib/selectors/thread-selectors';

import { connect, SQL } from '../database';
import { apnPush, fcmPush, getUnreadCounts } from './utils';
import { fetchThreadInfos } from '../fetchers/thread-fetcher';
import { fetchUserInfos } from '../fetchers/user-fetcher';

type Device = { deviceType: DeviceType, deviceToken: string };
type PushUserInfo = {
  devices: Device[],
  messageInfos: RawMessageInfo[],
};
type PushInfo = { [userID: string]: PushUserInfo };

async function sendPushNotifs(req: $Request, res: $Response) {
  res.json({ success: true });
  const pushInfo: PushInfo = req.body;

  if (Object.keys(pushInfo).length === 0) {
    return [];
  }

  const conn = await connect();
  const [
    unreadCounts,
    { rawThreadInfos, userInfos },
    dbIDs,
  ] = await Promise.all([
    getUnreadCounts(conn, Object.keys(pushInfo)),
    fetchInfos(conn, pushInfo),
    createDBIDs(conn, pushInfo),
  ]);

  const deliveryPromises = [];
  const notifications = {};
  for (let userID in pushInfo) {
    const threadInfos = rawThreadInfosToThreadInfos(
      rawThreadInfos,
      userID,
      userInfos,
    );
    for (let rawMessageInfo of pushInfo[userID].messageInfos) {
      const messageInfo = createMessageInfo(
        rawMessageInfo,
        userID,
        userInfos,
        threadInfos,
      );
      if (!messageInfo) {
        continue;
      }
      const threadInfo = threadInfos[messageInfo.threadID];
      const dbID = dbIDs.shift();
      invariant(dbID, "should have sufficient DB IDs");
      const byDeviceType = getDevicesByDeviceType(pushInfo[userID].devices);
      const delivery = {};
      if (byDeviceType.ios) {
        const notification = prepareIOSNotification(
          messageInfo,
          threadInfo,
          unreadCounts[userID],
        );
        deliveryPromises.push(apnPush(notification, byDeviceType.ios, dbID));
        delivery.iosDeviceTokens = byDeviceType.ios;
        delivery.iosID = notification.id;
      }
      if (byDeviceType.android) {
        const notification = prepareAndroidNotification(
          messageInfo,
          threadInfo,
          unreadCounts[userID],
          dbID,
        );
        deliveryPromises.push(fcmPush(
          notification,
          byDeviceType.android,
          dbID,
        ));
        delivery.androidDeviceTokens = byDeviceType.android;
      }
      notifications[dbID] = [
        dbID,
        userID,
        messageInfo.threadID,
        messageInfo.id,
        delivery,
        0,
      ];
    }
  }

  const dbPromises = [];
  if (dbIDs.length > 0) {
    const query = SQL`DELETE FROM ids WHERE id IN (${dbIDs})`;
    dbPromises.push(conn.query(query));
  }

  const [ deliveryResults ] = await Promise.all([
    Promise.all(deliveryPromises),
    Promise.all(dbPromises),
  ]);
  for (let deliveryResult of deliveryResults) {
    if (deliveryResult.errors) {
      notifications[deliveryResult.dbID][4].errors = deliveryResult.errors;
    }
    if (deliveryResult.fcmIDs) {
      notifications[deliveryResult.dbID][4].androidID =
        deliveryResult.fcmIDs[0];
    }
  }

  const flattenedNotifications = [];
  for (let dbID in notifications) {
    const notification = notifications[dbID];
    const jsonConverted = [...notification];
    jsonConverted[4] = JSON.stringify(jsonConverted[4]);
    flattenedNotifications.push(jsonConverted);
  }
  if (flattenedNotifications.length > 0) {
    const query = SQL`
      INSERT INTO notifications (id, user, thread, message, delivery, rescinded)
      VALUES ${flattenedNotifications}
    `;
    await conn.query(query);
  }

  conn.end();
}

async function fetchInfos(
  conn: Connection,
  pushInfo: PushInfo,
) {
  const threadIDs = new Set();
  for (let userID in pushInfo) {
    for (let rawMessageInfo of pushInfo[userID].messageInfos) {
      threadIDs.add(rawMessageInfo.threadID);
      if (
        rawMessageInfo.type === messageType.CREATE_THREAD &&
        rawMessageInfo.initialThreadState.parentThreadID
      ) {
        threadIDs.add(rawMessageInfo.initialThreadState.parentThreadID);
      } else if (rawMessageInfo.type === messageType.CREATE_SUB_THREAD) {
        threadIDs.add(rawMessageInfo.childThreadID);
      }
    }
  }

  // These threadInfos won't have currentUser set
  const { threadInfos: rawThreadInfos, userInfos: threadUserInfos } =
    await fetchThreadInfos(conn, SQL`t.id IN (${[...threadIDs]})`, true);

  const userInfos = await fetchMissingUserInfos(
    conn,
    threadUserInfos,
    pushInfo,
  );

  return { rawThreadInfos, userInfos };
}

async function fetchMissingUserInfos(
  conn: Connection,
  userInfos: { [id: string]: UserInfo },
  pushInfo: PushInfo,
) {
  const missingUserIDs = new Set();
  const addIfMissing = (userID: string) => {
    if (!userInfos[userID]) {
      missingUserIDs.add(userID);
    }
  };

  for (let userID in pushInfo) {
    for (let rawMessageInfo of pushInfo[userID].messageInfos) {
      addIfMissing(rawMessageInfo.creatorID);
      if (rawMessageInfo.type === messageType.ADD_MEMBERS) {
        for (let userID of rawMessageInfo.addedUserIDs) {
          addIfMissing(userID);
        }
      } else if (rawMessageInfo.type === messageType.CREATE_THREAD) {
        for (let userID of rawMessageInfo.initialThreadState.memberIDs) {
          addIfMissing(userID);
        }
      }
    }
  }

  let finalUserInfos = userInfos;
  if (missingUserIDs.size > 0) {
    const newUserInfos = await fetchUserInfos(conn, [...missingUserIDs]);
    finalUserInfos = { ...userInfos, ...newUserInfos };
  }
  return finalUserInfos;
}

async function createDBIDs(
  conn: Connection,
  pushInfo: PushInfo,
): Promise<string[]> {
  let numIDsNeeded = 0;
  for (let userID in pushInfo) {
    numIDsNeeded += pushInfo[userID].messageInfos.length;
  }
  if (!numIDsNeeded) {
    return [];
  }
  const tableNames = Array(numIDsNeeded).fill(["notifications"]);
  const query = SQL`INSERT INTO ids (table_name) VALUES ${tableNames}`;
  const [ result ] = await conn.query(query);
  const lastNewID = result.insertId;
  invariant(lastNewID !== null && lastNewID !== undefined, "should be set");
  const firstNewID = lastNewID - numIDsNeeded + 1;
  return Array.from(
    new Array(numIDsNeeded),
    (val, index) => (index + firstNewID).toString(),
  );
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
  messageInfo: MessageInfo,
  threadInfo: ThreadInfo,
  unreadCount: number,
): apn.Notification {
  const notifText = notifTextForMessageInfo(messageInfo, threadInfo);
  const uniqueID = uuidv4();
  const notification = new apn.Notification();
  notification.body = notifText;
  notification.topic = "org.squadcal.app";
  notification.sound = "default";
  notification.badge = unreadCount;
  notification.threadId = messageInfo.threadID;
  notification.id = uniqueID;
  notification.collapseId = uniqueID;
  notification.payload.id = uniqueID;
  return notification;
}

function prepareAndroidNotification(
  messageInfo: MessageInfo,
  threadInfo: ThreadInfo,
  unreadCount: number,
  dbID: string,
): Object {
  const notifText = notifTextForMessageInfo(messageInfo, threadInfo);
  return {
    data: {
      notifBody: notifText,
      badgeCount: unreadCount.toString(),
      threadID: messageInfo.threadID,
      dbID,
    },
  };
}

export {
  sendPushNotifs,
  apnPush,
};
