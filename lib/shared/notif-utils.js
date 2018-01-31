// @flow

import type {
  MessageInfo,
  RawMessageInfo,
  RobotextMessageInfo,
  MessageType,
} from '../types/message-types';
import type { ThreadInfo, RawThreadInfo } from '../types/thread-types';
import type { RelativeUserInfo } from '../types/user-types';

import invariant from 'invariant';

import { messageType } from '../types/message-types';
import {
  robotextForMessageInfo,
  robotextToRawString,
} from './message-utils';
import { threadIsTwoPersonChat } from './thread-utils';
import { stringForUser } from './user-utils';
import { prettyDate } from '../utils/date-utils';
import { pluralize } from '../utils/text-utils';

const notificationPressActionType = "NOTIFICATION_PRESS";

export type NotificationPressPayload = {
  rawThreadInfo: RawThreadInfo,
  clearChatRoutes: bool,
};

function notifTextForMessageInfo(
  messageInfos: MessageInfo[],
  threadInfo: ThreadInfo,
): string {
  const fullNotifText = fullNotifTextForMessageInfo(messageInfos, threadInfo);
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
  } else {
    return "your thread";
  }
}

function assertSingleMessageInfo(
  messageInfos: MessageInfo[],
): MessageInfo {
  if (messageInfos.length === 0) {
    throw new Error("expected single MessageInfo, but none present!");
  } else if (messageInfos.length !== 1) {
    const messageIDs = messageInfos.map(messageInfo => messageInfo.id);
    console.warn(
      "expected single MessageInfo, but there are multiple! " +
        messageIDs.join(", ")
    );
  }
  return messageInfos[0];
}

function mostRecentMessageInfoType(
  messageInfos: MessageInfo[],
): MessageType {
  if (messageInfos.length === 0) {
    throw new Error("expected MessageInfo, but none present!");
  }
  return messageInfos[0].type;
}

function fullNotifTextForMessageInfo(
  messageInfos: MessageInfo[],
  threadInfo: ThreadInfo,
): string {
  const mostRecentType = mostRecentMessageInfoType(messageInfos);
  if (mostRecentType === messageType.TEXT) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageType.TEXT,
      "messageInfo should be messageType.TEXT!",
    );
    if (!threadInfo.name && threadIsTwoPersonChat(threadInfo)) {
      return `${threadInfo.uiName}: ${messageInfo.text}`;
    } else {
      const userString = stringForUser(messageInfo.creator);
      const threadName = notifThreadName(threadInfo);
      return `${userString} to ${threadName}: ${messageInfo.text}`;
    }
  } else if (mostRecentType === messageType.CREATE_THREAD) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageType.CREATE_THREAD,
      "messageInfo should be messageType.CREATE_THREAD!",
    );
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
  } else if (mostRecentType === messageType.ADD_MEMBERS) {
    const addedMembersObject = {};
    for (let messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageType.ADD_MEMBERS,
        "messageInfo should be messageType.ADD_MEMBERS!",
      );
      for (let member of messageInfo.addedMembers) {
        addedMembersObject[member.id] = member;
      }
    }
    // https://github.com/facebook/flow/issues/2221
    const addedMembers =
      ((Object.values(addedMembersObject): any): RelativeUserInfo[]);

    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageType.ADD_MEMBERS,
      "messageInfo should be messageType.ADD_MEMBERS!",
    );
    const mergedMessageInfo = { ...mostRecentMessageInfo, addedMembers };

    const robotext = strippedRobotextForMessageInfo(
      mergedMessageInfo,
      threadInfo,
    );
    return `${robotext} to ${notifThreadName(threadInfo)}`;
  } else if (mostRecentType === messageType.CREATE_SUB_THREAD) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageType.CREATE_SUB_THREAD,
      "messageInfo should be messageType.CREATE_SUB_THREAD!",
    );
    return notifTextForSubthreadCreation(
      messageInfo.creator,
      threadInfo,
      messageInfo.childThreadInfo.name,
    );
  } else if (mostRecentType === messageType.REMOVE_MEMBERS) {
    const removedMembersObject = {};
    for (let messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageType.REMOVE_MEMBERS,
        "messageInfo should be messageType.REMOVE_MEMBERS!",
      );
      for (let member of messageInfo.removedMembers) {
        removedMembersObject[member.id] = member;
      }
    }
    // https://github.com/facebook/flow/issues/2221
    const removedMembers =
      ((Object.values(removedMembersObject): any): RelativeUserInfo[]);

    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageType.REMOVE_MEMBERS,
      "messageInfo should be messageType.REMOVE_MEMBERS!",
    );
    const mergedMessageInfo = { ...mostRecentMessageInfo, removedMembers };

    const robotext = strippedRobotextForMessageInfo(
      mergedMessageInfo,
      threadInfo,
    );
    return `${robotext} from ${notifThreadName(threadInfo)}`;
  } else if (mostRecentType === messageType.CHANGE_ROLE) {
    const membersObject = {};
    for (let messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageType.CHANGE_ROLE,
        "messageInfo should be messageType.CHANGE_ROLE!",
      );
      for (let member of messageInfo.members) {
        membersObject[member.id] = member;
      }
    }
    // https://github.com/facebook/flow/issues/2221
    const members = ((Object.values(membersObject): any): RelativeUserInfo[]);

    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageType.CHANGE_ROLE,
      "messageInfo should be messageType.CHANGE_ROLE!",
    );
    const mergedMessageInfo = { ...mostRecentMessageInfo, members };

    const robotext = strippedRobotextForMessageInfo(
      mergedMessageInfo,
      threadInfo,
    );
    return `${robotext} in ${notifThreadName(threadInfo)}`;
  } else if (mostRecentType === messageType.LEAVE_THREAD) {
    const leaverBeavers = {};
    for (let messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageType.LEAVE_THREAD,
        "messageInfo should be messageType.LEAVE_THREAD!",
      );
      leaverBeavers[messageInfo.creator.id] = messageInfo.creator;
    }
    // https://github.com/facebook/flow/issues/2221
    const leavers =
      ((Object.values(leaverBeavers): any): RelativeUserInfo[]);
    const leaversString = pluralize(leavers.map(stringForUser));

    return `${leaversString} left ${notifThreadName(threadInfo)}`;
  } else if (mostRecentType === messageType.JOIN_THREAD) {
    const joinerArray = {};
    for (let messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageType.JOIN_THREAD,
        "messageInfo should be messageType.JOIN_THREAD!",
      );
      joinerArray[messageInfo.creator.id] = messageInfo.creator;
    }
    // https://github.com/facebook/flow/issues/2221
    const joiners =
      ((Object.values(joinerArray): any): RelativeUserInfo[]);
    const joinersString = pluralize(joiners.map(stringForUser));

    return `${joinersString} joined ${notifThreadName(threadInfo)}`;
  } else if (
    mostRecentType === messageType.CREATE_ENTRY ||
    mostRecentType === messageType.EDIT_ENTRY
  ) {
    const hasCreateEntry = messageInfos.some(
      messageInfo => messageInfo.type === messageType.CREATE_ENTRY,
    );
    const messageInfo = messageInfos[0];
    if (!hasCreateEntry) {
      invariant(
        messageInfo.type === messageType.EDIT_ENTRY,
        "messageInfo should be messageType.EDIT_ENTRY!",
      );
      return `${stringForUser(messageInfo.creator)} updated the text of an ` +
        `event in ${notifThreadName(threadInfo)} for ` +
        `${prettyDate(messageInfo.date)}: "${messageInfo.text}"`;
    }
    invariant(
      messageInfo.type === messageType.CREATE_ENTRY ||
        messageInfo.type === messageType.EDIT_ENTRY,
      "messageInfo should be messageType.CREATE_ENTRY/EDIT_ENTRY!",
    );
    return `${stringForUser(messageInfo.creator)} created an event in ` +
      `${notifThreadName(threadInfo)} for ${prettyDate(messageInfo.date)}: ` +
      `"${messageInfo.text}"`;
  } else if (mostRecentType === messageType.CHANGE_SETTINGS) {
    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageType.CHANGE_SETTINGS,
      "messageInfo should be messageType.CHANGE_SETTINGS!",
    );
    return strippedRobotextForMessageInfo(mostRecentMessageInfo, threadInfo);
  } else {
    invariant(false, `unrecognized messageType ${mostRecentType}`);
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

function notifCollapseKeyForRawMessageInfo(
  rawMessageInfo: RawMessageInfo,
): ?string {
  const joinResult = (...keys: (string | number)[]) => keys.join("|");
  if (
    rawMessageInfo.type === messageType.ADD_MEMBERS ||
    rawMessageInfo.type === messageType.REMOVE_MEMBERS
  ) {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
    );
  } else if (rawMessageInfo.type === messageType.CHANGE_SETTINGS) {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
      rawMessageInfo.field,
    );
  } else if (rawMessageInfo.type === messageType.CHANGE_ROLE) {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
      rawMessageInfo.newRole,
    );
  } else if (
    rawMessageInfo.type === messageType.JOIN_THREAD ||
    rawMessageInfo.type === messageType.LEAVE_THREAD
  ) {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
    );
  } else if (
    rawMessageInfo.type === messageType.CREATE_ENTRY ||
    rawMessageInfo.type === messageType.EDIT_ENTRY
  ) {
    return joinResult(
      rawMessageInfo.creatorID,
      rawMessageInfo.entryID,
    );
  } else {
    return null;
  }
}

export {
  notificationPressActionType,
  notifTextForMessageInfo,
  notifCollapseKeyForRawMessageInfo,
};
