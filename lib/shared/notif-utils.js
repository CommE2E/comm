// @flow

import {
  type MessageInfo,
  type RawMessageInfo,
  type RobotextMessageInfo,
  type MessageType,
  messageTypes,
} from '../types/message-types';
import type { ThreadInfo } from '../types/thread-types';
import type { RelativeUserInfo } from '../types/user-types';

import invariant from 'invariant';

import { robotextForMessageInfo, robotextToRawString } from './message-utils';
import { threadIsGroupChat } from './thread-utils';
import { stringForUser } from './user-utils';
import { prettyDate } from '../utils/date-utils';
import { pluralize } from '../utils/text-utils';
import { values } from '../utils/objects';
import { contentStringForMediaArray } from '../media/media-utils';

type NotifTexts = {|
  merged: string,
  body: string,
  title: string,
  prefix?: string,
|};
function notifTextsForMessageInfo(
  messageInfos: MessageInfo[],
  threadInfo: ThreadInfo,
): NotifTexts {
  const fullNotifTexts = fullNotifTextsForMessageInfo(messageInfos, threadInfo);
  const result: NotifTexts = {
    merged: trimNotifText(fullNotifTexts.merged, 300),
    body: trimNotifText(fullNotifTexts.body, 300),
    title: trimNotifText(fullNotifTexts.title, 100),
  };
  if (fullNotifTexts.prefix) {
    result.prefix = trimNotifText(fullNotifTexts.prefix, 50);
  }
  return result;
}

function trimNotifText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substr(0, maxLength - 3) + '...';
}

const notifTextForSubthreadCreation = (
  creator: RelativeUserInfo,
  parentThreadInfo: ThreadInfo,
  childThreadName: ?string,
  childThreadUIName: string,
) => {
  const prefix = stringForUser(creator);
  let body = `created a new thread`;
  if (parentThreadInfo.name) {
    body += ` in ${parentThreadInfo.name}`;
  }
  let merged = `${prefix} ${body}`;
  if (childThreadName) {
    merged += ` called "${childThreadName}"`;
  }
  return {
    merged,
    body,
    title: childThreadUIName,
    prefix,
  };
};

function notifThreadName(threadInfo: ThreadInfo): string {
  if (threadInfo.name) {
    return threadInfo.name;
  } else {
    return 'your thread';
  }
}

function assertSingleMessageInfo(
  messageInfos: $ReadOnlyArray<MessageInfo>,
): MessageInfo {
  if (messageInfos.length === 0) {
    throw new Error('expected single MessageInfo, but none present!');
  } else if (messageInfos.length !== 1) {
    const messageIDs = messageInfos.map((messageInfo) => messageInfo.id);
    console.log(
      'expected single MessageInfo, but there are multiple! ' +
        messageIDs.join(', '),
    );
  }
  return messageInfos[0];
}

function mostRecentMessageInfoType(
  messageInfos: $ReadOnlyArray<MessageInfo>,
): MessageType {
  if (messageInfos.length === 0) {
    throw new Error('expected MessageInfo, but none present!');
  }
  return messageInfos[0].type;
}

function fullNotifTextsForMessageInfo(
  messageInfos: MessageInfo[],
  threadInfo: ThreadInfo,
): NotifTexts {
  const mostRecentType = mostRecentMessageInfoType(messageInfos);
  if (mostRecentType === messageTypes.TEXT) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.TEXT,
      'messageInfo should be messageTypes.TEXT!',
    );
    if (!threadInfo.name && !threadIsGroupChat(threadInfo)) {
      return {
        merged: `${threadInfo.uiName}: ${messageInfo.text}`,
        body: messageInfo.text,
        title: threadInfo.uiName,
      };
    } else {
      const userString = stringForUser(messageInfo.creator);
      const threadName = notifThreadName(threadInfo);
      return {
        merged: `${userString} to ${threadName}: ${messageInfo.text}`,
        body: messageInfo.text,
        title: threadInfo.uiName,
        prefix: `${userString}:`,
      };
    }
  } else if (mostRecentType === messageTypes.CREATE_THREAD) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.CREATE_THREAD,
      'messageInfo should be messageTypes.CREATE_THREAD!',
    );
    const parentThreadInfo = messageInfo.initialThreadState.parentThreadInfo;
    if (parentThreadInfo) {
      return notifTextForSubthreadCreation(
        messageInfo.creator,
        parentThreadInfo,
        messageInfo.initialThreadState.name,
        threadInfo.uiName,
      );
    }
    const prefix = stringForUser(messageInfo.creator);
    const body = 'created a new thread';
    let merged = `${prefix} ${body}`;
    if (messageInfo.initialThreadState.name) {
      merged += ` called "${messageInfo.initialThreadState.name}"`;
    }
    return {
      merged,
      body,
      title: threadInfo.uiName,
      prefix,
    };
  } else if (mostRecentType === messageTypes.ADD_MEMBERS) {
    const addedMembersObject = {};
    for (let messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.ADD_MEMBERS,
        'messageInfo should be messageTypes.ADD_MEMBERS!',
      );
      for (let member of messageInfo.addedMembers) {
        addedMembersObject[member.id] = member;
      }
    }
    const addedMembers = values(addedMembersObject);

    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageTypes.ADD_MEMBERS,
      'messageInfo should be messageTypes.ADD_MEMBERS!',
    );
    const mergedMessageInfo = { ...mostRecentMessageInfo, addedMembers };

    const robotext = strippedRobotextForMessageInfo(
      mergedMessageInfo,
      threadInfo,
    );
    const merged = `${robotext} to ${notifThreadName(threadInfo)}`;
    return {
      merged,
      title: threadInfo.uiName,
      body: robotext,
    };
  } else if (mostRecentType === messageTypes.CREATE_SUB_THREAD) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.CREATE_SUB_THREAD,
      'messageInfo should be messageTypes.CREATE_SUB_THREAD!',
    );
    return notifTextForSubthreadCreation(
      messageInfo.creator,
      threadInfo,
      messageInfo.childThreadInfo.name,
      messageInfo.childThreadInfo.uiName,
    );
  } else if (mostRecentType === messageTypes.REMOVE_MEMBERS) {
    const removedMembersObject = {};
    for (let messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.REMOVE_MEMBERS,
        'messageInfo should be messageTypes.REMOVE_MEMBERS!',
      );
      for (let member of messageInfo.removedMembers) {
        removedMembersObject[member.id] = member;
      }
    }
    const removedMembers = values(removedMembersObject);

    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageTypes.REMOVE_MEMBERS,
      'messageInfo should be messageTypes.REMOVE_MEMBERS!',
    );
    const mergedMessageInfo = { ...mostRecentMessageInfo, removedMembers };

    const robotext = strippedRobotextForMessageInfo(
      mergedMessageInfo,
      threadInfo,
    );
    const merged = `${robotext} from ${notifThreadName(threadInfo)}`;
    return {
      merged,
      title: threadInfo.uiName,
      body: robotext,
    };
  } else if (mostRecentType === messageTypes.CHANGE_ROLE) {
    const membersObject = {};
    for (let messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.CHANGE_ROLE,
        'messageInfo should be messageTypes.CHANGE_ROLE!',
      );
      for (let member of messageInfo.members) {
        membersObject[member.id] = member;
      }
    }
    const members = values(membersObject);

    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageTypes.CHANGE_ROLE,
      'messageInfo should be messageTypes.CHANGE_ROLE!',
    );
    const mergedMessageInfo = { ...mostRecentMessageInfo, members };

    const robotext = strippedRobotextForMessageInfo(
      mergedMessageInfo,
      threadInfo,
    );
    const merged = `${robotext} from ${notifThreadName(threadInfo)}`;
    return {
      merged,
      title: threadInfo.uiName,
      body: robotext,
    };
  } else if (mostRecentType === messageTypes.LEAVE_THREAD) {
    const leaverBeavers = {};
    for (let messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.LEAVE_THREAD,
        'messageInfo should be messageTypes.LEAVE_THREAD!',
      );
      leaverBeavers[messageInfo.creator.id] = messageInfo.creator;
    }
    const leavers = values(leaverBeavers);
    const leaversString = pluralize(leavers.map(stringForUser));

    const body = `${leaversString} left`;
    const merged = `${body} ${notifThreadName(threadInfo)}`;
    return {
      merged,
      title: threadInfo.uiName,
      body,
    };
  } else if (mostRecentType === messageTypes.JOIN_THREAD) {
    const joinerArray = {};
    for (let messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.JOIN_THREAD,
        'messageInfo should be messageTypes.JOIN_THREAD!',
      );
      joinerArray[messageInfo.creator.id] = messageInfo.creator;
    }
    const joiners = values(joinerArray);
    const joinersString = pluralize(joiners.map(stringForUser));

    const body = `${joinersString} joined`;
    const merged = `${body} ${notifThreadName(threadInfo)}`;
    return {
      merged,
      title: threadInfo.uiName,
      body,
    };
  } else if (
    mostRecentType === messageTypes.CREATE_ENTRY ||
    mostRecentType === messageTypes.EDIT_ENTRY
  ) {
    const hasCreateEntry = messageInfos.some(
      (messageInfo) => messageInfo.type === messageTypes.CREATE_ENTRY,
    );
    const messageInfo = messageInfos[0];
    if (!hasCreateEntry) {
      invariant(
        messageInfo.type === messageTypes.EDIT_ENTRY,
        'messageInfo should be messageTypes.EDIT_ENTRY!',
      );
      const body =
        `updated the text of an event in ` +
        `${notifThreadName(threadInfo)} scheduled for ` +
        `${prettyDate(messageInfo.date)}: "${messageInfo.text}"`;
      const prefix = stringForUser(messageInfo.creator);
      const merged = `${prefix} ${body}`;
      return {
        merged,
        title: threadInfo.uiName,
        body,
        prefix,
      };
    }
    invariant(
      messageInfo.type === messageTypes.CREATE_ENTRY ||
        messageInfo.type === messageTypes.EDIT_ENTRY,
      'messageInfo should be messageTypes.CREATE_ENTRY/EDIT_ENTRY!',
    );
    const prefix = stringForUser(messageInfo.creator);
    const body =
      `created an event in ${notifThreadName(threadInfo)} ` +
      `scheduled for ${prettyDate(messageInfo.date)}: "${messageInfo.text}"`;
    const merged = `${prefix} ${body}`;
    return {
      merged,
      title: threadInfo.uiName,
      body,
      prefix,
    };
  } else if (mostRecentType === messageTypes.DELETE_ENTRY) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.DELETE_ENTRY,
      'messageInfo should be messageTypes.DELETE_ENTRY!',
    );
    const prefix = stringForUser(messageInfo.creator);
    const body =
      `deleted an event in ${notifThreadName(threadInfo)} ` +
      `scheduled for ${prettyDate(messageInfo.date)}: "${messageInfo.text}"`;
    const merged = `${prefix} ${body}`;
    return {
      merged,
      title: threadInfo.uiName,
      body,
      prefix,
    };
  } else if (mostRecentType === messageTypes.RESTORE_ENTRY) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.RESTORE_ENTRY,
      'messageInfo should be messageTypes.RESTORE_ENTRY!',
    );
    const prefix = stringForUser(messageInfo.creator);
    const body =
      `restored an event in ${notifThreadName(threadInfo)} ` +
      `scheduled for ${prettyDate(messageInfo.date)}: "${messageInfo.text}"`;
    const merged = `${prefix} ${body}`;
    return {
      merged,
      title: threadInfo.uiName,
      body,
      prefix,
    };
  } else if (mostRecentType === messageTypes.CHANGE_SETTINGS) {
    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageTypes.CHANGE_SETTINGS,
      'messageInfo should be messageTypes.CHANGE_SETTINGS!',
    );
    const body = strippedRobotextForMessageInfo(
      mostRecentMessageInfo,
      threadInfo,
    );
    return {
      merged: body,
      title: threadInfo.uiName,
      body,
    };
  } else if (
    mostRecentType === messageTypes.IMAGES ||
    mostRecentType === messageTypes.MULTIMEDIA
  ) {
    const media = [];
    for (let messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.IMAGES ||
          messageInfo.type === messageTypes.MULTIMEDIA,
        'messageInfo should be multimedia type!',
      );
      for (let singleMedia of messageInfo.media) {
        media.push(singleMedia);
      }
    }
    const contentString = contentStringForMediaArray(media);
    const userString = stringForUser(messageInfos[0].creator);

    let body, merged;
    if (!threadInfo.name && !threadIsGroupChat(threadInfo)) {
      body = `sent you ${contentString}`;
      merged = body;
    } else {
      body = `sent ${contentString}`;
      const threadName = notifThreadName(threadInfo);
      merged = `${body} to ${threadName}`;
    }
    merged = `${userString} ${merged}`;

    return {
      merged,
      body,
      title: threadInfo.uiName,
      prefix: userString,
    };
  } else if (mostRecentType === messageTypes.UPDATE_RELATIONSHIP) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    const prefix = stringForUser(messageInfo.creator);
    const title = threadInfo.uiName;
    const body =
      messageInfo.operation === 'request_sent'
        ? 'sent you a friend request'
        : 'accepted your friend request';
    const merged = `${prefix} ${body}`;
    return {
      merged,
      body,
      title,
      prefix,
    };
  } else {
    invariant(false, `we're not aware of messageType ${mostRecentType}`);
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

const joinResult = (...keys: (string | number)[]) => keys.join('|');
function notifCollapseKeyForRawMessageInfo(
  rawMessageInfo: RawMessageInfo,
): ?string {
  if (
    rawMessageInfo.type === messageTypes.ADD_MEMBERS ||
    rawMessageInfo.type === messageTypes.REMOVE_MEMBERS
  ) {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
    );
  } else if (
    rawMessageInfo.type === messageTypes.IMAGES ||
    rawMessageInfo.type === messageTypes.MULTIMEDIA
  ) {
    // We use the legacy constant here to collapse both types into one
    return joinResult(
      messageTypes.IMAGES,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
    );
  } else if (rawMessageInfo.type === messageTypes.CHANGE_SETTINGS) {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
      rawMessageInfo.field,
    );
  } else if (rawMessageInfo.type === messageTypes.CHANGE_ROLE) {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
      rawMessageInfo.newRole,
    );
  } else if (
    rawMessageInfo.type === messageTypes.JOIN_THREAD ||
    rawMessageInfo.type === messageTypes.LEAVE_THREAD
  ) {
    return joinResult(rawMessageInfo.type, rawMessageInfo.threadID);
  } else if (
    rawMessageInfo.type === messageTypes.CREATE_ENTRY ||
    rawMessageInfo.type === messageTypes.EDIT_ENTRY
  ) {
    return joinResult(rawMessageInfo.creatorID, rawMessageInfo.entryID);
  } else {
    return null;
  }
}

type Unmerged = $ReadOnly<{
  body: string,
  title: string,
  prefix?: string,
  ...
}>;
type Merged = {|
  body: string,
  title: string,
|};
function mergePrefixIntoBody(unmerged: Unmerged): Merged {
  const { body, title, prefix } = unmerged;
  const merged = prefix ? `${prefix} ${body}` : body;
  return { body: merged, title };
}

export {
  notifTextsForMessageInfo,
  notifCollapseKeyForRawMessageInfo,
  mergePrefixIntoBody,
};
