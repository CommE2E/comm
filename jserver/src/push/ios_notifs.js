// @flow

import type { $Response, $Request } from 'express';
import type { RawMessageInfo, MessageInfo } from 'lib/types/message-types';
import type { UserInfo } from 'lib/types/user-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { Connection } from '../database';

import apn from 'apn';
import invariant from 'invariant';
import uuidv4 from 'uuid/v4';

import { notifTextForMessageInfo } from 'lib/shared/notif-utils';
import { messageType } from 'lib/types/message-types';
import { createMessageInfo } from 'lib/shared/message-utils';

import apnConfig from '../../secrets/apn_config';
import { connect, SQL } from '../database';
import { getUnreadCounts } from './utils';
import { fetchThreadInfos } from '../fetchers/thread-fetcher';
import { fetchUserInfos } from '../fetchers/user-fetcher';

type IOSPushUserInfo = {
  deviceTokens: string[],
  messageInfos: RawMessageInfo[],
};
type IOSPushInfo = { [userID: string]: IOSPushUserInfo };

const apnProvider = new apn.Provider(apnConfig);

async function sendIOSPushNotifs(req: $Request, res: $Response) {
  res.json({ success: true });
  const pushInfo: IOSPushInfo = req.body;

  if (Object.keys(pushInfo).length === 0) {
    return [];
  }

  const conn = await connect();
  const [
    unreadCounts,
    { threadInfos, userInfos },
    dbIDs,
  ] = await Promise.all([
    getUnreadCounts(conn, Object.keys(pushInfo)),
    fetchInfos(conn, pushInfo),
    createDBIDs(conn, pushInfo),
  ]);

  const apnPromises = [];
  const notifications = {};
  for (let userID in pushInfo) {
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
      const notification = prepareNotification(
        messageInfo,
        threadInfo,
        unreadCounts[userID],
      );
      apnPromises.push(apnPush(
        apnProvider,
        notification,
        pushInfo[userID].deviceTokens,
        dbID,
      ));
      notifications[dbID] = [
        dbID,
        userID,
        messageInfo.threadID,
        messageInfo.id,
        {
          iosDeviceTokens: pushInfo[userID].deviceTokens,
          iosIdentifier: notification.id,
        },
        0,
      ];
    }
  }
  const dbPromises = [];
  if (dbIDs.length > 0) {
    const query = SQL`DELETE FROM ids WHERE id IN (${dbIDs})`;
    dbPromises.push(conn.query(query));
  }

  const [ apnResults ] = await Promise.all([
    Promise.all(apnPromises),
    Promise.all(dbPromises),
  ]);
  for (let apnResult of apnResults) {
    if (apnResult.error) {
      notifications[apnResult.dbID][4].error = apnResult.error;
    }
  }

  const flattenedNotifications = [];
  for (let dbID in notifications) {
    const notification = notifications[dbID];
    const jsonConverted = [...notification];
    jsonConverted[4] = JSON.stringify(jsonConverted[4]);
    flattenedNotifications.push(jsonConverted);
  }
  if (notifications.length > 0) {
    const query = SQL`
      INSERT INTO notifications (id, user, thread, message, delivery, rescinded)
      VALUES ${flattenedNotifications}
    `;
    await conn.query(query);
  }
  conn.end();
}

async function apnPush(
  apnProvider: apn.Provider,
  notification: apn.Notification,
  deviceTokens: string[],
  dbID: string,
) {
  const result = await apnProvider.send(notification, deviceTokens);
  for (let failure of result.failed) {
    return { error: failure, dbID };
  }
  return { success: true, dbID };
}

async function fetchInfos(
  conn: Connection,
  pushInfo: IOSPushInfo,
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
  const { threadInfos, userInfos: threadUserInfos } =
    await fetchThreadInfos(conn, SQL`t.id IN (${[...threadIDs]})`, true);

  const userInfos = await fetchMissingUserInfos(
    conn,
    threadUserInfos,
    pushInfo,
  );

  return { threadInfos, userInfos };
}

async function fetchMissingUserInfos(
  conn: Connection,
  userInfos: { [id: string]: UserInfo },
  pushInfo: IOSPushInfo,
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
  pushInfo: IOSPushInfo,
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

function prepareNotification(
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
  return notification;
}

export {
  sendIOSPushNotifs,
  apnPush,
};
