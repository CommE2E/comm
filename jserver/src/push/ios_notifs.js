// @flow

import type { $Response, $Request } from 'express';
import type { RawMessageInfo } from 'lib/types/message-types';

import apn from 'apn';

import apnConfig from '../../secrets/apn_config';
import { connect, SQL } from '../database';

type IOSPushUserInfo = {
  deviceTokens: string[],
  messageInfos: RawMessageInfo[],
};
type IOSPushInfo = { [userID: string]: IOSPushUserInfo };

const apnProvider = new apn.Provider(apnConfig);

async function sendIOSPushNotifs(req: $Request, res: $Response) {
  res.json({ success: true });

  const pushInfo: IOSPushInfo = req.body;
  const unreadCounts = await getUnreadCounts(Object.keys(pushInfo));

  const promises = [];
  for (let userID in pushInfo) {
    for (let messageInfo of pushInfo[userID].messageInfos) {
      const notification = new apn.Notification();
      notification.alert = "Hello, world!";
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
  userIDs: string[],
): Promise<{ [userID: string]: number }> {
  const conn = await connect();
  const intUserIDs = userIDs.map(parseInt);
  const query = SQL`
    SELECT user, COUNT(thread) AS unread_count
    FROM memberships
    WHERE user IN (${intUserIDs}) AND unread = 1 AND role != 0
    GROUP BY user
  `;
  const [ result ] = await conn.query(query);
  conn.end();
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

export {
  sendIOSPushNotifs,
};
