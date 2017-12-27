// @flow

import type { $Response, $Request } from 'express';
import type { RawMessageInfo } from 'lib/types/message-types';

import apn from 'apn';

import apnConfig from '../../keys/apn_config';

type IOSPushUserInfo = {
  deviceTokens: string[],
  messageInfos: RawMessageInfo[],
};
type IOSPushInfo = { [userID: string]: IOSPushUserInfo };

const apnProvider = new apn.Provider(apnConfig);

async function sendIOSPushNotifs(req: $Request, res: $Response) {
  const pushInfo: IOSPushInfo = req.body;
  const promises = [];
  for (let userID in pushInfo) {
    for (let messageInfo of pushInfo[userID].messageInfos) {
      const notification = new apn.Notification();
      notification.alert = "Hello, world!";
      notification.topic = "org.squadcal.app";
      notification.badge = 0;
      promises.push(apnProvider.send(
        notification,
        pushInfo[userID].deviceTokens,
      ));
    }
  }
  return await Promise.all(promises);
}

export {
  sendIOSPushNotifs,
};
