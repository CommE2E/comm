// @flow

import type {
  MessageInfo,
  RawMessageInfo,
  RobotextMessageInfo,
  TextMessageInfo,
  MessageData,
} from '../types/message-types';
import type { RelativeUserInfo } from '../types/user-types';
import type { UserInfo } from '../types/user-types';
import type { ThreadInfo } from '../types/thread-types';

import invariant from 'invariant';

import { messageType } from '../types/message-types';
import { prettyDate } from '../utils/date-utils';
import { userIDsToRelativeUserInfos } from '../selectors/user-selectors';

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

function encodedThreadEntity(threadID: string, text: string): string {
  return `<${text}|t${threadID}>`;
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
    let text =
      `created ${encodedThreadEntity(messageInfo.threadID, 'this thread')}`;
    const parentThread = messageInfo.initialThreadState.parentThreadInfo;
    if (parentThread) {
      text += " as a child of " +
        `<${encodeURI(parentThread.uiName)}|t${parentThread.id}>`;
    }
    if (messageInfo.initialThreadState.name) {
      text += " with the name " +
        `"${encodeURI(messageInfo.initialThreadState.name)}"`;
    }
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
    let text = `${creator} created a child thread`;
    const childName = messageInfo.childThreadInfo.name;
    if (childName) {
      text +=
        ` named "<${encodeURI(childName)}|t${messageInfo.childThreadInfo.id}>"`;
    }
    return text;
  } else if (messageInfo.type === messageType.CHANGE_SETTINGS) {
    let value;
    if (messageInfo.field === "color") {
      value = `<#${messageInfo.value}|c${messageInfo.threadID}>`;
    } else {
      value = messageInfo.value;
    }
    return `${creator} updated ` +
      `${encodedThreadEntity(messageInfo.threadID, 'the thread')}'s ` +
      `${messageInfo.field} to "${value}"`;
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
    return `${creator} left ` +
      encodedThreadEntity(messageInfo.threadID, 'this thread');
  } else if (messageInfo.type === messageType.JOIN_THREAD) {
    return `${creator} joined ` +
      encodedThreadEntity(messageInfo.threadID, 'this thread');
  } else if (messageInfo.type === messageType.CREATE_ENTRY) {
    const date = prettyDate(messageInfo.date);
    return `${creator} created an event for ${date}: "${messageInfo.text}"`;
  } else if (messageInfo.type === messageType.EDIT_ENTRY) {
    const date = prettyDate(messageInfo.date);
    return `${creator} updated the text of an event for ` +
      `${date}: "${messageInfo.text}"`;
  }
  invariant(false, `${messageInfo.type} is not a messageType!`);
}

function robotextToRawString(robotext: string): string {
  return decodeURI(robotext.replace(/<([^<>\|]+)\|[^<>\|]+>/g, "$1"));
}

function createMessageInfo(
  rawMessageInfo: RawMessageInfo,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
  threadInfos: {[id: string]: ThreadInfo},
): ?MessageInfo {
  const creatorInfo = userInfos[rawMessageInfo.creatorID];
  if (!creatorInfo) {
    return null;
  }
  if (rawMessageInfo.type === messageType.TEXT) {
    const messageInfo: TextMessageInfo = {
      type: messageType.TEXT,
      threadID: rawMessageInfo.threadID,
      creator: {
        id: rawMessageInfo.creatorID,
        username: creatorInfo.username,
        isViewer: rawMessageInfo.creatorID === viewerID,
      },
      time: rawMessageInfo.time,
      text: rawMessageInfo.text,
    };
    if (rawMessageInfo.id) {
      messageInfo.id = rawMessageInfo.id;
    }
    if (rawMessageInfo.localID) {
      messageInfo.localID = rawMessageInfo.localID;
    }
    return messageInfo;
  } else if (rawMessageInfo.type === messageType.CREATE_THREAD) {
    const initialParentThreadID =
      rawMessageInfo.initialThreadState.parentThreadID;
    return {
      type: messageType.CREATE_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: {
        id: rawMessageInfo.creatorID,
        username: creatorInfo.username,
        isViewer: rawMessageInfo.creatorID === viewerID,
      },
      time: rawMessageInfo.time,
      initialThreadState: {
        name: rawMessageInfo.initialThreadState.name,
        parentThreadInfo: initialParentThreadID
          ? threadInfos[initialParentThreadID]
          : null,
        visibilityRules: rawMessageInfo.initialThreadState.visibilityRules,
        color: rawMessageInfo.initialThreadState.color,
        otherMembers: userIDsToRelativeUserInfos(
          rawMessageInfo.initialThreadState.memberIDs.filter(
            (userID: string) => userID !== rawMessageInfo.creatorID,
          ),
          viewerID,
          userInfos,
        ),
      },
    };
  } else if (rawMessageInfo.type === messageType.ADD_MEMBERS) {
    const addedMembers = userIDsToRelativeUserInfos(
      rawMessageInfo.addedUserIDs,
      viewerID,
      userInfos,
    );
    return {
      type: messageType.ADD_MEMBERS,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: {
        id: rawMessageInfo.creatorID,
        username: creatorInfo.username,
        isViewer: rawMessageInfo.creatorID === viewerID,
      },
      time: rawMessageInfo.time,
      addedMembers,
    };
  } else if (rawMessageInfo.type === messageType.CREATE_SUB_THREAD) {
    return {
      type: messageType.CREATE_SUB_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: {
        id: rawMessageInfo.creatorID,
        username: creatorInfo.username,
        isViewer: rawMessageInfo.creatorID === viewerID,
      },
      time: rawMessageInfo.time,
      childThreadInfo: threadInfos[rawMessageInfo.childThreadID],
    };
  } else if (rawMessageInfo.type === messageType.CHANGE_SETTINGS) {
    return {
      type: messageType.CHANGE_SETTINGS,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: {
        id: rawMessageInfo.creatorID,
        username: creatorInfo.username,
        isViewer: rawMessageInfo.creatorID === viewerID,
      },
      time: rawMessageInfo.time,
      field: rawMessageInfo.field,
      value: rawMessageInfo.value,
    };
  } else if (rawMessageInfo.type === messageType.REMOVE_MEMBERS) {
    const removedMembers = userIDsToRelativeUserInfos(
      rawMessageInfo.removedUserIDs,
      viewerID,
      userInfos,
    );
    return {
      type: messageType.REMOVE_MEMBERS,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: {
        id: rawMessageInfo.creatorID,
        username: creatorInfo.username,
        isViewer: rawMessageInfo.creatorID === viewerID,
      },
      time: rawMessageInfo.time,
      removedMembers,
    };
  } else if (rawMessageInfo.type === messageType.CHANGE_ROLE) {
    const members = userIDsToRelativeUserInfos(
      rawMessageInfo.userIDs,
      viewerID,
      userInfos,
    );
    return {
      type: messageType.CHANGE_ROLE,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: {
        id: rawMessageInfo.creatorID,
        username: creatorInfo.username,
        isViewer: rawMessageInfo.creatorID === viewerID,
      },
      time: rawMessageInfo.time,
      members,
      newRole: rawMessageInfo.newRole,
    };
  } else if (rawMessageInfo.type === messageType.LEAVE_THREAD) {
    return {
      type: messageType.LEAVE_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: {
        id: rawMessageInfo.creatorID,
        username: creatorInfo.username,
        isViewer: rawMessageInfo.creatorID === viewerID,
      },
      time: rawMessageInfo.time,
    };
  } else if (rawMessageInfo.type === messageType.JOIN_THREAD) {
    return {
      type: messageType.JOIN_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: {
        id: rawMessageInfo.creatorID,
        username: creatorInfo.username,
        isViewer: rawMessageInfo.creatorID === viewerID,
      },
      time: rawMessageInfo.time,
    };
  } else if (rawMessageInfo.type === messageType.CREATE_ENTRY) {
    return {
      type: messageType.CREATE_ENTRY,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: {
        id: rawMessageInfo.creatorID,
        username: creatorInfo.username,
        isViewer: rawMessageInfo.creatorID === viewerID,
      },
      time: rawMessageInfo.time,
      entryID: rawMessageInfo.entryID,
      date: rawMessageInfo.date,
      text: rawMessageInfo.text,
    };
  } else if (rawMessageInfo.type === messageType.EDIT_ENTRY) {
    return {
      type: messageType.EDIT_ENTRY,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: {
        id: rawMessageInfo.creatorID,
        username: creatorInfo.username,
        isViewer: rawMessageInfo.creatorID === viewerID,
      },
      time: rawMessageInfo.time,
      entryID: rawMessageInfo.entryID,
      date: rawMessageInfo.date,
      text: rawMessageInfo.text,
    };
  }
  invariant(false, `${rawMessageInfo.type} is not a messageType!`);
}

function sortMessageInfoList<T: MessageInfo | RawMessageInfo>(
  messageInfos: T[],
): T[] {
  return messageInfos.sort((a: T, b: T) => b.time - a.time);
}

function rawMessageInfoFromMessageData(
  messageData: MessageData,
  id: string,
): RawMessageInfo {
  if (messageData.type === messageType.TEXT) {
    return {
      type: messageType.TEXT,
      id,
      threadID: messageData.threadID,
      creatorID: messageData.creatorID,
      time: messageData.time,
      text: messageData.text,
    };
  } else if (messageData.type === messageType.CREATE_THREAD) {
    return {
      type: messageType.CREATE_THREAD,
      id,
      threadID: messageData.threadID,
      creatorID: messageData.creatorID,
      time: messageData.time,
      initialThreadState: messageData.initialThreadState,
    };
  } else if (messageData.type === messageType.ADD_MEMBERS) {
    return {
      type: messageType.ADD_MEMBERS,
      id,
      threadID: messageData.threadID,
      creatorID: messageData.creatorID,
      time: messageData.time,
      addedUserIDs: messageData.addedUserIDs,
    };
  } else if (messageData.type === messageType.CREATE_SUB_THREAD) {
    return {
      type: messageType.CREATE_SUB_THREAD,
      id,
      threadID: messageData.threadID,
      creatorID: messageData.creatorID,
      time: messageData.time,
      childThreadID: messageData.childThreadID,
    };
  } else if (messageData.type === messageType.CHANGE_SETTINGS) {
    return {
      type: messageType.CHANGE_SETTINGS,
      id,
      threadID: messageData.threadID,
      creatorID: messageData.creatorID,
      time: messageData.time,
      field: messageData.field,
      value: messageData.value,
    };
  } else if (messageData.type === messageType.REMOVE_MEMBERS) {
    return {
      type: messageType.REMOVE_MEMBERS,
      id,
      threadID: messageData.threadID,
      creatorID: messageData.creatorID,
      time: messageData.time,
      removedUserIDs: messageData.removedUserIDs,
    };
  } else if (messageData.type === messageType.CHANGE_ROLE) {
    return {
      type: messageType.CHANGE_ROLE,
      id,
      threadID: messageData.threadID,
      creatorID: messageData.creatorID,
      time: messageData.time,
      userIDs: messageData.userIDs,
      newRole: messageData.newRole,
    };
  } else if (messageData.type === messageType.LEAVE_THREAD) {
    return {
      type: messageType.LEAVE_THREAD,
      id,
      threadID: messageData.threadID,
      creatorID: messageData.creatorID,
      time: messageData.time,
    };
  } else if (messageData.type === messageType.JOIN_THREAD) {
    return {
      type: messageType.JOIN_THREAD,
      id,
      threadID: messageData.threadID,
      creatorID: messageData.creatorID,
      time: messageData.time,
    };
  } else if (messageData.type === messageType.CREATE_ENTRY) {
    return {
      type: messageType.CREATE_ENTRY,
      id,
      threadID: messageData.threadID,
      creatorID: messageData.creatorID,
      time: messageData.time,
      entryID: messageData.entryID,
      date: messageData.date,
      text: messageData.text,
    };
  } else if (messageData.type === messageType.EDIT_ENTRY) {
    return {
      type: messageType.EDIT_ENTRY,
      id,
      threadID: messageData.threadID,
      creatorID: messageData.creatorID,
      time: messageData.time,
      entryID: messageData.entryID,
      date: messageData.date,
      text: messageData.text,
    };
  } else {
    invariant(false, `unrecognized messageType ${messageData.type}`);
  }
}

export {
  messageKey,
  messageID,
  robotextForMessageInfo,
  robotextToRawString,
  createMessageInfo,
  sortMessageInfoList,
  rawMessageInfoFromMessageData,
};
