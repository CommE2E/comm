// @flow

import invariant from 'invariant';

import {
  type MessageInfo,
  type RawMessageInfo,
  type RobotextMessageInfo,
  type MessageType,
} from '../types/message-types';
import type { ResolvedNotifTexts } from '../types/notif-types';
import type { ThreadInfo, ThreadType } from '../types/thread-types';
import type { RelativeUserInfo } from '../types/user-types';
import type { GetENSNames } from '../utils/ens-helpers';
import {
  ET,
  getEntityTextAsString,
  type EntityText,
} from '../utils/entity-text';
import { promiseAll } from '../utils/promises';
import { trimText } from '../utils/text-utils';
import { robotextForMessageInfo } from './message-utils';
import { messageSpecs } from './messages/message-specs';
import { threadNoun } from './thread-utils';
import { stringForUser } from './user-utils';

async function notifTextsForMessageInfo(
  messageInfos: MessageInfo[],
  threadInfo: ThreadInfo,
  getENSNames: ?GetENSNames,
): Promise<ResolvedNotifTexts> {
  const fullNotifTexts = await fullNotifTextsForMessageInfo(
    messageInfos,
    threadInfo,
    getENSNames,
  );
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

async function fullNotifTextsForMessageInfo(
  messageInfos: $ReadOnlyArray<MessageInfo>,
  threadInfo: ThreadInfo,
  getENSNames: ?GetENSNames,
): Promise<ResolvedNotifTexts> {
  const mostRecentType = mostRecentMessageInfoType(messageInfos);
  const messageSpec = messageSpecs[mostRecentType];
  invariant(
    messageSpec.notificationTexts,
    `we're not aware of messageType ${mostRecentType}`,
  );
  const innerNotificationTexts = (
    innerMessageInfos: $ReadOnlyArray<MessageInfo>,
    innerThreadInfo: ThreadInfo,
  ) =>
    fullNotifTextsForMessageInfo(
      innerMessageInfos,
      innerThreadInfo,
      getENSNames,
    );
  const unresolvedNotifTexts = await messageSpec.notificationTexts(
    messageInfos,
    threadInfo,
    {
      notifThreadName,
      notifTextForSubthreadCreation,
      notificationTexts: innerNotificationTexts,
    },
  );

  const resolveToString = async (
    entityText: string | EntityText,
  ): Promise<string> => {
    if (typeof entityText === 'string') {
      return entityText;
    }
    const notifString = await getEntityTextAsString(entityText, getENSNames, {
      prefixThisThreadNounWith: 'your',
    });
    invariant(
      notifString !== null && notifString !== undefined,
      'getEntityTextAsString only returns falsey when passed falsey',
    );
    return notifString;
  };
  let promises = {
    merged: resolveToString(unresolvedNotifTexts.merged),
    body: resolveToString(unresolvedNotifTexts.body),
    title: resolveToString(unresolvedNotifTexts.title),
  };
  if (unresolvedNotifTexts.prefix) {
    promises = {
      ...promises,
      prefix: resolveToString(unresolvedNotifTexts.prefix),
    };
  }
  return await promiseAll(promises);
}

function notifRobotextForMessageInfo(
  messageInfo: RobotextMessageInfo,
  threadInfo: ThreadInfo,
): EntityText {
  const robotext = robotextForMessageInfo(messageInfo, threadInfo);
  return robotext.map(entity => {
    if (
      typeof entity !== 'string' &&
      entity.type === 'thread' &&
      entity.id === threadInfo.id
    ) {
      return ET.thread({
        display: 'shortName',
        threadInfo,
        possessive: entity.possessive,
      });
    }
    return entity;
  });
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
  notifRobotextForMessageInfo,
  notifTextsForMessageInfo,
  notifCollapseKeyForRawMessageInfo,
  mergePrefixIntoBody,
};
