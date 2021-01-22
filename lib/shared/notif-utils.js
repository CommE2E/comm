// @flow

import invariant from 'invariant';

import {
  type MessageInfo,
  type RawMessageInfo,
  type RobotextMessageInfo,
  type MessageType,
  messageTypes,
} from '../types/message-types';
import type { NotifTexts } from '../types/notif-types';
import type { ThreadInfo, ThreadType } from '../types/thread-types';
import type { RelativeUserInfo } from '../types/user-types';
import { robotextForMessageInfo, robotextToRawString } from './message-utils';
import { messageSpecs } from './messages/message-specs';
import { threadNoun } from './thread-utils';
import { stringForUser } from './user-utils';

function notifTextsForMessageInfo(
  messageInfos: MessageInfo[],
  threadInfo: ThreadInfo,
): NotifTexts {
  const fullNotifTexts = fullNotifTextsForMessageInfo(messageInfos, threadInfo);
  return {
    merged: trimNotifText(fullNotifTexts.merged, 300),
    body: trimNotifText(fullNotifTexts.body, 300),
    title: trimNotifText(fullNotifTexts.title, 100),
    ...(fullNotifTexts.prefix && {
      prefix: trimNotifText(fullNotifTexts.prefix, 50),
    }),
  };
}

function trimNotifText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substr(0, maxLength - 3) + '...';
}

const notifTextForSubthreadCreation = (
  creator: RelativeUserInfo,
  threadType: ThreadType,
  parentThreadInfo: ThreadInfo,
  childThreadName: ?string,
  childThreadUIName: string,
) => {
  const prefix = stringForUser(creator);
  let body = `created a new ${threadNoun(threadType)}`;
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

function mostRecentMessageInfoType(
  messageInfos: $ReadOnlyArray<MessageInfo>,
): MessageType {
  if (messageInfos.length === 0) {
    throw new Error('expected MessageInfo, but none present!');
  }
  return messageInfos[0].type;
}

function fullNotifTextsForMessageInfo(
  messageInfos: $ReadOnlyArray<MessageInfo>,
  threadInfo: ThreadInfo,
): NotifTexts {
  const mostRecentType = mostRecentMessageInfoType(messageInfos);
  const messageSpec = messageSpecs[mostRecentType];
  invariant(
    messageSpec.notificationTexts,
    `we're not aware of messageType ${mostRecentType}`,
  );
  return messageSpec.notificationTexts(messageInfos, threadInfo, {
    notifThreadName,
    notifTextForSubthreadCreation,
    strippedRobotextForMessageInfo,
    notificationTexts: fullNotifTextsForMessageInfo,
  });
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
