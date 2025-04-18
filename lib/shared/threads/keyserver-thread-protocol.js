// @flow

import invariant from 'invariant';

import {
  type ThreadProtocol,
  type ProtocolSendTextMessageTypeInput,
  type SendTextMessageUtils,
} from './thread-spec.js';

const keyserverThreadProtocol: ThreadProtocol = Object.freeze({
  sendTextMessage: async (
    message: ProtocolSendTextMessageTypeInput,
    utils: SendTextMessageUtils,
  ) => {
    const { messageInfo, sidebarCreation } = message;
    const { localID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );
    const result = await utils.sendKeyserverTextMessage({
      threadID: messageInfo.threadID,
      localID,
      text: messageInfo.text,
      sidebarCreation,
    });
    return {
      localID,
      serverID: result.id,
      threadID: messageInfo.threadID,
      time: result.time,
    };
  },
});

export { keyserverThreadProtocol };
