// @flow

import type { MessageInfo } from '../types/message-types';
import type { ThreadInfo } from '../types/thread-types';

import { messageType } from '../types/message-types';
import {
  robotextForMessageInfo,
  robotextToRawString,
} from './message-utils';
import { threadIsTwoPersonChat, threadIsNamed } from './thread-utils';
import { stringForUser } from './user-utils';

function notifTextForMessageInfo(
  messageInfo: MessageInfo,
  threadInfo: ThreadInfo,
): string {
  const fullNotifText = fullNotifTextForMessageInfo(messageInfo, threadInfo);
  if (fullNotifText.length <= 300) {
    return fullNotifText;
  }
  return fullNotifText.substr(0, 297) + "...";
}

function fullNotifTextForMessageInfo(
  messageInfo: MessageInfo,
  threadInfo: ThreadInfo,
): string {
  if (messageInfo.type !== messageType.TEXT) {
    return robotextToRawString(robotextForMessageInfo(
      messageInfo,
      threadInfo,
    ));
  }
  const userString = stringForUser(messageInfo.creator);
  if (threadIsNamed(threadInfo)) {
    return `${userString} to ${threadInfo.name}: ${messageInfo.text}`;
  } else if (threadIsTwoPersonChat(threadInfo)) {
    return `${userString}: ${messageInfo.text}`;
  } else {
    return `${userString} to your thread: ${messageInfo.text}`;
  }
}

export {
  notifTextForMessageInfo,
};
