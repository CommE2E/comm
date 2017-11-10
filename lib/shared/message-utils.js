// @flow

import type {
  MessageInfo,
  RawMessageInfo,
  RobotextMessageInfo,
} from '../types/message-types';
import type { RelativeUserInfo } from '../types/user-types';
import type { ThreadInfo } from '../types/thread-types';

import invariant from 'invariant';

import { messageType } from '../types/message-types';

// Prefers localID
function messageKey(messageInfo: MessageInfo | RawMessageInfo): string {
  if (messageInfo.type === 0 && messageInfo.localID) {
    return messageInfo.localID;
  }
  invariant(messageInfo.id, "localID should exist if ID does not");
  return messageInfo.id;
}

// Prefers serverID
function messageID(messageInfo: MessageInfo | RawMessageInfo): string {
  if (messageInfo.id) {
    return messageInfo.id;
  }
  invariant(messageInfo.type === 0, "only MessageType.TEXT can have localID");
  invariant(messageInfo.localID, "localID should exist if ID does not");
  return messageInfo.localID;
}

function robotextForUser(user: RelativeUserInfo): string {
  if (user.isViewer) {
    return "you";
  } else if (user.username) {
    return `<${encodeURI(user.username)}|u${user.id}>`;
  } else {
    return "anonymous";
  }
}

function robotextForUsers(users: RelativeUserInfo[]): string {
  if (users.length === 1) {
    return robotextForUser(users[0]);
  } else if (users.length === 2) {
    return `${robotextForUser(users[0])} and ${robotextForUser(users[1])}`;
  } else if (users.length === 3) {
    return `${robotextForUser(users[0])}, ${robotextForUser(users[1])}, ` +
      `and ${robotextForUser(users[2])}`;
  } else {
    return `${robotextForUser(users[0])}, ${robotextForUser(users[1])}, ` +
      `and ${users.length - 2} others`;
  }
}

function robotextForMessageInfo(
  messageInfo: RobotextMessageInfo,
  threadInfo: ThreadInfo,
): string {
  invariant(
    messageInfo.type !== messageType.TEXT,
    "robotext is no substitute for human text!",
  );
  const creator = robotextForUser(messageInfo.creator);
  if (messageInfo.type === messageType.CREATE_THREAD) {
    let text = "created this thread ";
    const parentThread = messageInfo.initialThreadState.parentThreadInfo;
    if (parentThread) {
      text += "as a child of " +
        `"<${encodeURI(parentThread.name)}|t${parentThread.id}>" `;
    }
    text += `with the name "${encodeURI(messageInfo.initialThreadState.name)}"`;
    const users = messageInfo.initialThreadState.otherMembers;
    if (users.length !== 0) {
      const initialUsersString = robotextForUsers(users);
      text += ` and added ${initialUsersString}`;
    }
    return `${creator} ${text}`;
  } else if (messageInfo.type === messageType.ADD_MEMBERS) {
    const users = messageInfo.addedMembers;
    invariant(users.length !== 0, "added who??");
    const addedUsersString = robotextForUsers(users);
    return `${creator} added ${addedUsersString}`;
  } else if (messageInfo.type === messageType.CREATE_SUB_THREAD) {
    const childName = messageInfo.childThreadInfo.name;
    return `${creator} created a child thread named ` +
      `"<${encodeURI(childName)}|t${messageInfo.childThreadInfo.id}>"`;
  } else if (messageInfo.type === messageType.CHANGE_SETTINGS) {
    let value;
    if (messageInfo.field === "color") {
      value = `<#${messageInfo.value}|c${messageInfo.threadID}>`;
    } else {
      value = messageInfo.value;
    }
    return `${creator} updated the thread's ${messageInfo.field} to ` +
      `"${value}"`;
  } else if (messageInfo.type === messageType.REMOVE_MEMBERS) {
    const users = messageInfo.removedMembers;
    invariant(users.length !== 0, "removed who??");
    const removedUsersString = robotextForUsers(users);
    return `${creator} removed ${removedUsersString}`;
  } else if (messageInfo.type === messageType.CHANGE_ROLE) {
    const users = messageInfo.members;
    invariant(users.length !== 0, "changed whose role??");
    const usersString = robotextForUsers(users);
    const verb = threadInfo.roles[messageInfo.newRole].isDefault
      ? "removed"
      : "added";
    const noun = users.length === 1 ? "an admin" : "admins";
    return `${creator} ${verb} ${usersString} as ${noun}`;
  } else if (messageInfo.type === messageType.LEAVE_THREAD) {
    return `${creator} left this thread`;
  } else if (messageInfo.type === messageType.JOIN_THREAD) {
    return `${creator} joined this thread`;
  }
  invariant(false, `${messageInfo.type} is not a messageType!`);
}

function robotextToRawString(robotext: string): string {
  return decodeURI(robotext.replace(/<([^<>\|]+)\|[^<>\|]+>/g, "$1"));
}

export {
  messageKey,
  messageID,
  robotextForMessageInfo,
  robotextToRawString,
};
