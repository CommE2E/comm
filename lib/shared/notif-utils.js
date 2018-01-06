// @flow

import type { MessageInfo, RobotextMessageInfo } from '../types/message-types';
import type { ThreadInfo } from '../types/thread-types';
import type { RelativeUserInfo } from '../types/user-types';

import invariant from 'invariant';

import { messageType } from '../types/message-types';
import {
  robotextForMessageInfo,
  robotextToRawString,
} from './message-utils';
import { threadIsTwoPersonChat, threadIsNamed } from './thread-utils';
import { stringForUser } from './user-utils';
import { prettyDate } from '../utils/date-utils';

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
  if (messageInfo.type === messageType.TEXT) {
    const userString = stringForUser(messageInfo.creator);
    if (threadIsNamed(threadInfo)) {
      return `${userString} to ${threadInfo.name}: ${messageInfo.text}`;
    } else if (threadIsTwoPersonChat(threadInfo)) {
      return `${userString}: ${messageInfo.text}`;
    } else {
      return `${userString} to your thread: ${messageInfo.text}`;
    }
  } else if (messageInfo.type === messageType.CREATE_THREAD) {
    let text = `${stringForUser(messageInfo.creator)} created a new thread `;
    const parentThread = messageInfo.initialThreadState.parentThreadInfo;
    if (parentThread) {
      text += `in ${parentThread.name} `;
    }
    text += `called "${messageInfo.initialThreadState.name}"`;
    return text;
  } else if (messageInfo.type === messageType.ADD_MEMBERS) {
    const robotext = strippedRobotextForMessageInfo(messageInfo, threadInfo);
    return `${robotext} to ${threadInfo.name}`;
  } else if (messageInfo.type === messageType.CREATE_SUB_THREAD) {
    invariant(false, "no notifs should correspond to CREATE_SUB_THREAD");
  } else if (messageInfo.type === messageType.REMOVE_MEMBERS) {
    const robotext = strippedRobotextForMessageInfo(messageInfo, threadInfo);
    return `${robotext} from ${threadInfo.name}`;
  } else if (messageInfo.type === messageType.CHANGE_ROLE) {
    const robotext = strippedRobotextForMessageInfo(messageInfo, threadInfo);
    return `${robotext} in ${threadInfo.name}`;
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
    threadInfo.name,
  );
  return robotextToRawString(threadMadeExplicit);
}

export {
  notifTextForMessageInfo,
};
