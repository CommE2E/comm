// @flow

import type { $Response, $Request } from 'express';
import type { RawMessageInfo } from 'lib/types/message-types';

type IOSPushUserInfo = {
  deviceTokens: string[],
  messageInfos: RawMessageInfo[],
};
type IOSPushInfo = { [userID: string]: IOSPushUserInfo };

async function sendIOSPushNotifs(req: $Request, res: $Response) {
  const pushInfo: IOSPushInfo = req.body;
  return pushInfo;
}

export {
  sendIOSPushNotifs,
};
