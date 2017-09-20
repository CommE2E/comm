// @flow

import type {
  MessageInfo,
  RawMessageInfo,
  RobotextMessageInfo,
} from '../types/message-types';

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

function usernameString(usernames: string[]): string {
  if (usernames.length === 1) {
    return usernames[0];
  } else if (usernames.length === 2) {
    return `${usernames[0]} and ${usernames[1]}`;
  } else if (usernames.length === 3) {
    return `${usernames[0]}, ${usernames[1]}, and ${usernames[2]}`;
  } else {
    return `${usernames[0]}, ${usernames[1]}, ` +
      `and ${usernames.length - 2} others`;
  }
}

function robotextForMessageInfo(
  messageInfo: RobotextMessageInfo,
): [string, string] {
  invariant(
    messageInfo.type !== messageType.TEXT,
    "robotext is no substitute for human text!",
  );
  let creator;
  if (messageInfo.isViewer) {
    creator = "you";
  } else if (messageInfo.creator) {
    creator = messageInfo.creator;
  } else {
    creator = "anonymous";
  }
  if (messageInfo.type === messageType.CREATE_THREAD) {
    let text = "created the thread with the name " +
      `"${messageInfo.initialThreadState.name}"`;
    const usernames = messageInfo.initialThreadState.otherMemberUsernames;
    if (usernames.length !== 0) {
      const initialUsersString = usernameString(usernames);
      text += ` and added ${initialUsersString}`;
    }
    return [creator, text];
  } else if (messageInfo.type === messageType.ADD_USER) {
    const usernames = messageInfo.addedUsernames;
    invariant(usernames.length !== 0, "added who??");
    const addedUsersString = usernameString(usernames);
    return [creator, `added ${addedUsersString}`];
  }
  invariant(false, `${messageInfo.type} is not a messageType!`);
}

export {
  messageKey,
  messageID,
  robotextForMessageInfo,
};
