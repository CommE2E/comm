// @flow

import type { $Response, $Request } from 'express';
import type { RawMessageInfo } from 'lib/types/message-types';
import type { UserInfo } from 'lib/types/user-types';
import type { Connection } from '../database';

import apn from 'apn';

import { notifTextForMessageInfo } from 'lib/shared/notif-utils';
import { messageType } from 'lib/types/message-types';
import { createMessageInfo } from 'lib/shared/message-utils';

import apnConfig from '../../secrets/apn_config';
import { connect, SQL } from '../database';
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

  const conn = await connect();
  const [ unreadCounts, { threadInfos, userInfos } ] = await Promise.all([
    getUnreadCounts(conn, Object.keys(pushInfo)),
    fetchInfos(conn, pushInfo),
  ]);
  conn.end();

  const promises = [];
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
      const notification = new apn.Notification();
      notification.alert = notifTextForMessageInfo(
        messageInfo,
        threadInfo,
      );
      notification.topic = "org.squadcal.app";
      notification.badge = unreadCounts[userID];
      promises.push(apnProvider.send(
        notification,
        pushInfo[userID].deviceTokens,
      ));
    }
  }

  return await Promise.all(promises);
}

async function getUnreadCounts(
  conn: Connection,
  userIDs: string[],
): Promise<{ [userID: string]: number }> {
  const query = SQL`
    SELECT user, COUNT(thread) AS unread_count
    FROM memberships
    WHERE user IN (${userIDs}) AND unread = 1 AND role != 0
    GROUP BY user
  `;
  const [ result ] = await conn.query(query);
  const usersToUnreadCounts = {};
  for (let row of result) {
    usersToUnreadCounts[row.user.toString()] = row.unread_count;
  }
  for (let userID of userIDs) {
    if (usersToUnreadCounts[userID] === undefined) {
      usersToUnreadCounts[userID] = 0;
    }
  }
  return usersToUnreadCounts;
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

export {
  sendIOSPushNotifs,
};
