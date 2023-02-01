// @flow

import invariant from 'invariant';

import {
  type MessageInfo,
  type RawMessageInfo,
  type RobotextMessageInfo,
  type MessageType,
} from '../types/message-types';
import type { NotifTexts } from '../types/notif-types';
import type { ThreadInfo, ThreadType } from '../types/thread-types';
import type { RelativeUserInfo } from '../types/user-types';
import { trimText } from '../utils/text-utils';
import { robotextForMessageInfo, robotextToRawString } from './message-utils';
import { messageSpecs } from './messages/message-specs';
import { threadNoun } from './thread-utils';
import { stringForUser } from './user-utils';

function notifTextsForMessageInfo(
  messageInfos: MessageInfo[],
  threadInfo: ThreadInfo,
): NotifTexts {
  const fullNotifTexts = fullNotifTextsForMessageInfo(messageInfos, threadInfo);
  const merged = trimText(fullNotifTexts.merged, 300);
  const body = trimText(fullNotifTexts.body, 300);
  const title = trimText(fullNotifTexts.title, 100);
  if (!fullNotifTexts.prefix) {
    return { merged, body, title };
  }
  const prefix = trimText(fullNotifTexts.prefix, 50);
  return { merged, body, title, prefix };
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
    return 'your chat';
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
  const threadName = notifThreadName(threadInfo);
  if (typeof robotext === 'string') {
    const threadEntityRegex = new RegExp(`<[^<>\\|]+\\|t${threadInfo.id}>`);
    const threadMadeExplicit = robotext.replace(threadEntityRegex, threadName);
    return robotextToRawString(threadMadeExplicit);
  } else {
    const threadMadeExplicit = robotext.map(entity => {
      if (
        typeof entity !== 'string' &&
        entity.type === 'thread' &&
        entity.id === threadInfo.id
      ) {
        return threadName;
      }
      return entity;
    });
    return robotextToRawString(threadMadeExplicit);
  }
}

function notifCollapseKeyForRawMessageInfo(
  rawMessageInfo: RawMessageInfo,
): ?string {
  const messageSpec = messageSpecs[rawMessageInfo.type];
  return messageSpec.notificationCollapseKey?.(rawMessageInfo) ?? null;
}

type Unmerged = $ReadOnly<{
  body: string,
  title: string,
  prefix?: string,
  ...
}>;
type Merged = {
  body: string,
  title: string,
};
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
