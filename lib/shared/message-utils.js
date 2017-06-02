// @flow

import type { MessageInfo } from '../types/message-types';

import invariant from 'invariant';

function messageKey(messageInfo: MessageInfo): string {
  if (messageInfo.localID) {
    return messageInfo.localID;
  }
  invariant(messageInfo.id, "localID should exist if ID does not");
  return messageInfo.id;
}

export { messageKey }
