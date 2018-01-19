// @flow

import type { $Response, $Request } from 'express';
import type { RawMessageInfo, MessageInfo } from 'lib/types/message-types';
import type { UserInfo } from 'lib/types/user-types';
import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types';
import type { Connection } from '../database';
import type { DeviceType } from 'lib/actions/device-actions';
import type {
  CollapsableNotifInfo,
  FetchCollapsableNotifsResult,
} from '../fetchers/message-fetcher';

import apn from 'apn';
import invariant from 'invariant';
import uuidv4 from 'uuid/v4';

import { notifTextForMessageInfo } from 'lib/shared/notif-utils';
import { messageType } from 'lib/types/message-types';
import {
  createMessageInfo,
  sortMessageInfoList,
} from 'lib/shared/message-utils';
import { rawThreadInfosToThreadInfos } from 'lib/selectors/thread-selectors';

import { connect, SQL, appendSQLArray } from '../database';
import { apnPush, fcmPush, getUnreadCounts } from './utils';
import { fetchThreadInfos } from '../fetchers/thread-fetcher';
import { fetchUserInfos } from '../fetchers/user-fetcher';
import { fetchCollapsableNotifs } from '../fetchers/message-fetcher';

type Device = { deviceType: DeviceType, deviceToken: string };
type PushUserInfo = {
  devices: Device[],
  messageInfos: RawMessageInfo[],
};
export type PushInfo = { [userID: string]: PushUserInfo };

async function sendPushNotifs(req: $Request, res: $Response) {
  res.json({ success: true });
  const pushInfo: PushInfo = req.body;

  if (Object.keys(pushInfo).length === 0) {
    return [];
  }

  const conn = await connect();
  const [
    unreadCounts,
    { usersToCollapsableNotifInfo, rawThreadInfos, userInfos },
    dbIDs,
  ] = await Promise.all([
    getUnreadCounts(conn, Object.keys(pushInfo)),
    fetchInfos(conn, pushInfo),
    createDBIDs(conn, pushInfo),
  ]);

  const deliveryPromises = [];
  const notifications = {};
  for (let userID in usersToCollapsableNotifInfo) {
    const threadInfos = rawThreadInfosToThreadInfos(
      rawThreadInfos,
      userID,
      userInfos,
    );
    for (let notifInfo of usersToCollapsableNotifInfo[userID]) {
      const hydrateMessageInfo =
        (rawMessageInfo: RawMessageInfo) => createMessageInfo(
          rawMessageInfo,
          userID,
          userInfos,
          threadInfos,
        );
      const newMessageInfos = notifInfo.newMessageInfos.map(
        hydrateMessageInfo,
      ).filter(Boolean);
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
      const dbID = dbIDs.shift();
      invariant(dbID, "should have sufficient DB IDs");
      const byDeviceType = getDevicesByDeviceType(pushInfo[userID].devices);
      const delivery = {};
      if (byDeviceType.ios) {
        const notification = prepareIOSNotification(
          allMessageInfos,
          threadInfo,
          notifInfo.collapseKey,
          unreadCounts[userID],
        );
        deliveryPromises.push(apnPush(notification, byDeviceType.ios, dbID));
        delivery.iosDeviceTokens = byDeviceType.ios;
        delivery.iosID = notification.id;
      }
      if (byDeviceType.android) {
        const notification = prepareAndroidNotification(
          allMessageInfos,
          threadInfo,
          notifInfo.collapseKey,
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
    cleanUpPromises.push(conn.query(query));
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
    dbPromises.push(removeInvalidTokens(
      conn,
      invalidTokens,
    ));
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
    dbPromises.push(conn.query(query));
  }
  if (dbPromises.length > 0) {
    await Promise.all(dbPromises);
  }

  conn.end();
}

async function fetchInfos(
  conn: Connection,
  pushInfo: PushInfo,
) {
  const collapsableNotifsResult = await fetchCollapsableNotifs(conn, pushInfo);

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
  const { threadInfos: rawThreadInfos, userInfos: threadUserInfos } =
    await fetchThreadInfos(conn, SQL`t.id IN (${[...threadIDs]})`, true);
  const mergedUserInfos = {
    ...collapsableNotifsResult.userInfos,
    ...threadUserInfos,
  };

  const userInfos = await fetchMissingUserInfos(
    conn,
    mergedUserInfos,
    usersToCollapsableNotifInfo,
  );

  return { usersToCollapsableNotifInfo, rawThreadInfos, userInfos };
}

async function fetchMissingUserInfos(
  conn: Connection,
  userInfos: { [id: string]: UserInfo },
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
  messageInfos: MessageInfo[],
  threadInfo: ThreadInfo,
  collapseKey: ?string,
  unreadCount: number,
): apn.Notification {
  const notifText = notifTextForMessageInfo(messageInfos, threadInfo);
  const uniqueID = uuidv4();
  const notification = new apn.Notification();
  notification.body = notifText;
  notification.topic = "org.squadcal.app";
  notification.sound = "default";
  notification.badge = unreadCount;
  notification.threadId = threadInfo.id;
  notification.id = uniqueID;
  notification.payload.id = uniqueID;
  notification.payload.threadID = threadInfo.id;
  if (collapseKey) {
    notification.collapseId = collapseKey;
  }
  return notification;
}

function prepareAndroidNotification(
  messageInfos: MessageInfo[],
  threadInfo: ThreadInfo,
  collapseKey: ?string,
  unreadCount: number,
  dbID: string,
): Object {
  const notifText = notifTextForMessageInfo(messageInfos, threadInfo);
  const data = {};
  data.notifBody = notifText;
  data.badgeCount = unreadCount.toString();
  data.threadID = threadInfo.id.toString();
  data.notifID = collapseKey ? collapseKey : dbID;
  return { data };
}

type InvalidToken = {
  userID: string,
  fcmTokens?: string[],
  apnTokens?: string[],
};
async function removeInvalidTokens(
  conn: Connection,
  invalidTokens: InvalidToken[],
) {
  const query = SQL`
    UPDATE cookies
    SET android_device_token = NULL, ios_device_token = NULL
    WHERE (
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
    const statement = SQL`(user = ${invalidTokenUser.userID} AND (`;
    appendSQLArray(statement, deviceConditions, SQL` OR `);
    statement.append(SQL`))`);
    sqlTuples.push(statement);
  }
  appendSQLArray(query, sqlTuples, SQL` OR `);
  query.append(SQL`)`);

  await conn.query(query);
}

export {
  sendPushNotifs,
  apnPush,
};
