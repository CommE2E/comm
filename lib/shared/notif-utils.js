// @flow

import type { MessageInfo, RobotextMessageInfo } from '../types/message-types';
import type { ThreadInfo, RawThreadInfo } from '../types/thread-types';
import type { RelativeUserInfo } from '../types/user-types';

import { messageType } from '../types/message-types';
import {
  robotextForMessageInfo,
  robotextToRawString,
} from './message-utils';
import { threadIsTwoPersonChat } from './thread-utils';
import { stringForUser } from './user-utils';
import { prettyDate } from '../utils/date-utils';

const notificationPressActionType = "NOTIFICATION_PRESS";

export type NotificationPressPayload = {
  rawThreadInfo: RawThreadInfo,
  clearChatRoutes: bool,
};

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

const notifTextForSubthreadCreation = (
  creator: RelativeUserInfo,
  parentThreadInfo: ThreadInfo,
  childThreadName: ?string,
) => {
  let text = `${stringForUser(creator)} created a new thread`;
  if (parentThreadInfo.name) {
    text += ` in ${parentThreadInfo.name}`;
  }
  if (childThreadName) {
    text += ` called "${childThreadName}"`;
  }
  return text;
}

function notifThreadName(threadInfo: ThreadInfo): string {
  if (threadInfo.name) {
    return threadInfo.name;
  } else if (threadIsTwoPersonChat(threadInfo)) {
    return threadInfo.uiName;
  } else {
    return "your thread";
  }
}

function fullNotifTextForMessageInfo(
  messageInfo: MessageInfo,
  threadInfo: ThreadInfo,
): string {
  if (messageInfo.type === messageType.TEXT) {
    if (!threadInfo.name && threadIsTwoPersonChat(threadInfo)) {
      return `${threadInfo.uiName}: ${messageInfo.text}`;
    } else {
      const userString = stringForUser(messageInfo.creator);
      const threadName = notifThreadName(threadInfo);
      return `${userString} to ${threadName}: ${messageInfo.text}`;
    }
  } else if (messageInfo.type === messageType.CREATE_THREAD) {
    const parentThreadInfo = messageInfo.initialThreadState.parentThreadInfo;
    if (parentThreadInfo) {
      return notifTextForSubthreadCreation(
        messageInfo.creator,
        parentThreadInfo,
        messageInfo.initialThreadState.name,
      );
    }
    let text = `${stringForUser(messageInfo.creator)} created a new thread`;
    if (messageInfo.initialThreadState.name) {
      text += ` called "${messageInfo.initialThreadState.name}"`;
    }
    return text;
  } else if (messageInfo.type === messageType.ADD_MEMBERS) {
    const robotext = strippedRobotextForMessageInfo(messageInfo, threadInfo);
    return `${robotext} to ${notifThreadName(threadInfo)}`;
  } else if (messageInfo.type === messageType.CREATE_SUB_THREAD) {
    return notifTextForSubthreadCreation(
      messageInfo.creator,
      threadInfo,
      messageInfo.childThreadInfo.name,
    );
  } else if (messageInfo.type === messageType.REMOVE_MEMBERS) {
    const robotext = strippedRobotextForMessageInfo(messageInfo, threadInfo);
    return `${robotext} from ${notifThreadName(threadInfo)}`;
  } else if (messageInfo.type === messageType.CHANGE_ROLE) {
    const robotext = strippedRobotextForMessageInfo(messageInfo, threadInfo);
    return `${robotext} in ${notifThreadName(threadInfo)}`;
  } else if (messageInfo.type === messageType.CREATE_ENTRY) {
    return `${stringForUser(messageInfo.creator)} created an event for ` +
      `${prettyDate(messageInfo.date)}: "${messageInfo.text}"`;
  } else if (messageInfo.type === messageType.EDIT_ENTRY) {
    return `${stringForUser(messageInfo.creator)} updated the text of an ` +
      `event for ${prettyDate(messageInfo.date)}: "${messageInfo.text}"`;
  } else {
    return strippedRobotextForMessageInfo(messageInfo, threadInfo);
  }
}

function strippedRobotextForMessageInfo(
  messageInfo: RobotextMessageInfo,
  threadInfo: ThreadInfo,
): string {
  const robotext = robotextForMessageInfo(messageInfo, threadInfo);
  const threadEntityRegex = new RegExp(`<[^<>\\|]+\\|t${threadInfo.id}>`);
  const threadMadeExplicit = robotext.replace(
    threadEntityRegex,
    notifThreadName(threadInfo),
  );
  return robotextToRawString(threadMadeExplicit);
}

export {
  notificationPressActionType,
  notifTextForMessageInfo,
};
