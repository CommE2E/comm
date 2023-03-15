// @flow

import invariant from 'invariant';

import { isMentioned } from './mention-utils.js';
import { robotextForMessageInfo } from './message-utils.js';
import type { NotificationTextsParams } from './messages/message-spec.js';
import { messageSpecs } from './messages/message-specs.js';
import { threadNoun } from './thread-utils.js';
import {
  type MessageInfo,
  type RawMessageInfo,
  type RobotextMessageInfo,
  type MessageType,
  type MessageData,
  type SidebarSourceMessageInfo,
  messageTypes,
} from '../types/message-types.js';
import type { CreateSidebarMessageInfo } from '../types/messages/create-sidebar.js';
import type { TextMessageInfo } from '../types/messages/text.js';
import type { NotifTexts, ResolvedNotifTexts } from '../types/notif-types.js';
import {
  type ThreadInfo,
  type ThreadType,
  threadTypes,
} from '../types/thread-types.js';
import type { RelativeUserInfo, UserInfo } from '../types/user-types.js';
import { prettyDate } from '../utils/date-utils.js';
import type { GetENSNames } from '../utils/ens-helpers.js';
import {
  ET,
  getEntityTextAsString,
  type EntityText,
  type ThreadEntity,
} from '../utils/entity-text.js';
import { promiseAll } from '../utils/promises.js';
import { trimText } from '../utils/text-utils.js';

async function notifTextsForMessageInfo(
  messageInfos: MessageInfo[],
  threadInfo: ThreadInfo,
  notifTargetUserInfo: UserInfo,
  getENSNames: ?GetENSNames,
): Promise<?ResolvedNotifTexts> {
  const fullNotifTexts = await fullNotifTextsForMessageInfo(
    messageInfos,
    threadInfo,
    notifTargetUserInfo,
    getENSNames,
  );
  if (!fullNotifTexts) {
    return fullNotifTexts;
  }
  const merged = trimText(fullNotifTexts.merged, 300);
  const body = trimText(fullNotifTexts.body, 300);
  const title = trimText(fullNotifTexts.title, 100);
  if (!fullNotifTexts.prefix) {
    return { merged, body, title };
  }
  const prefix = trimText(fullNotifTexts.prefix, 50);
  return { merged, body, title, prefix };
}

function notifTextsForEntryCreationOrEdit(
  messageInfos: $ReadOnlyArray<MessageInfo>,
  threadInfo: ThreadInfo,
): NotifTexts {
  const hasCreateEntry = messageInfos.some(
    messageInfo => messageInfo.type === messageTypes.CREATE_ENTRY,
  );
  const messageInfo = messageInfos[0];

  const thread = ET.thread({ display: 'shortName', threadInfo });
  const creator = ET.user({ userInfo: messageInfo.creator });
  const prefix = ET`${creator}`;

  if (!hasCreateEntry) {
    invariant(
      messageInfo.type === messageTypes.EDIT_ENTRY,
      'messageInfo should be messageTypes.EDIT_ENTRY!',
    );
    const date = prettyDate(messageInfo.date);
    let body = ET`updated the text of an event in ${thread}`;
    body = ET`${body} scheduled for ${date}: "${messageInfo.text}"`;
    const merged = ET`${prefix} ${body}`;
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
  const date = prettyDate(messageInfo.date);
  let body = ET`created an event in ${thread}`;
  body = ET`${body} scheduled for ${date}: "${messageInfo.text}"`;
  const merged = ET`${prefix} ${body}`;
  return {
    merged,
    title: threadInfo.uiName,
    body,
    prefix,
  };
}

type NotifTextsForSubthreadCreationInput = {
  +creator: RelativeUserInfo,
  +threadType: ThreadType,
  +parentThreadInfo: ThreadInfo,
  +childThreadName: ?string,
  +childThreadUIName: string | ThreadEntity,
};
function notifTextsForSubthreadCreation(
  input: NotifTextsForSubthreadCreationInput,
): NotifTexts {
  const {
    creator,
    threadType,
    parentThreadInfo,
    childThreadName,
    childThreadUIName,
  } = input;

  const prefix = ET`${ET.user({ userInfo: creator })}`;

  let body = `created a new ${threadNoun(threadType, parentThreadInfo.id)}`;
  if (parentThreadInfo.name && parentThreadInfo.type !== threadTypes.GENESIS) {
    body = ET`${body} in ${parentThreadInfo.name}`;
  }

  let merged = ET`${prefix} ${body}`;
  if (childThreadName) {
    merged = ET`${merged} called "${childThreadName}"`;
  }

  return {
    merged,
    body,
    title: childThreadUIName,
    prefix,
  };
}

type NotifTextsForSidebarCreationInput = {
  +createSidebarMessageInfo: CreateSidebarMessageInfo,
  +sidebarSourceMessageInfo?: ?SidebarSourceMessageInfo,
  +firstSidebarMessageInfo?: ?TextMessageInfo,
  +threadInfo: ThreadInfo,
  +params: NotificationTextsParams,
};
function notifTextsForSidebarCreation(
  input: NotifTextsForSidebarCreationInput,
): NotifTexts {
  const {
    sidebarSourceMessageInfo,
    createSidebarMessageInfo,
    firstSidebarMessageInfo,
    threadInfo,
    params,
  } = input;

  const creator = ET.user({ userInfo: createSidebarMessageInfo.creator });
  const prefix = ET`${creator}`;

  const initialName = createSidebarMessageInfo.initialThreadState.name;
  const sourceMessageAuthorPossessive = ET.user({
    userInfo: createSidebarMessageInfo.sourceMessageAuthor,
    possessive: true,
  });

  let body = `started a thread in response to `;
  body = ET`${body} ${sourceMessageAuthorPossessive} message`;

  const { username } = params.notifTargetUserInfo;

  if (
    username &&
    sidebarSourceMessageInfo &&
    sidebarSourceMessageInfo.sourceMessage.type === messageTypes.TEXT &&
    isMentioned(username, sidebarSourceMessageInfo.sourceMessage.text)
  ) {
    body = ET`${body} that tagged you`;
  } else if (
    username &&
    firstSidebarMessageInfo &&
    isMentioned(username, firstSidebarMessageInfo.text)
  ) {
    body = ET`${body} and tagged you`;
  } else if (initialName) {
    body = ET`${body} "${initialName}"`;
  }

  return {
    merged: ET`${prefix} ${body}`,
    body,
    title: threadInfo.uiName,
    prefix,
  };
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
  notifTargetUserInfo: UserInfo,
  getENSNames: ?GetENSNames,
): Promise<?ResolvedNotifTexts> {
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
      notifTargetUserInfo,
      getENSNames,
    );
  const unresolvedNotifTexts = await messageSpec.notificationTexts(
    messageInfos,
    threadInfo,
    { notifTargetUserInfo, notificationTexts: innerNotificationTexts },
  );
  if (!unresolvedNotifTexts) {
    return unresolvedNotifTexts;
  }

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
    title: resolveToString(ET`${unresolvedNotifTexts.title}`),
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

function getNotifCollapseKey(
  rawMessageInfo: RawMessageInfo,
  messageData: MessageData,
): ?string {
  const messageSpec = messageSpecs[rawMessageInfo.type];
  return (
    messageSpec.notificationCollapseKey?.(rawMessageInfo, messageData) ?? null
  );
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
  notifTextsForEntryCreationOrEdit,
  notifTextsForSubthreadCreation,
  notifTextsForSidebarCreation,
  getNotifCollapseKey,
  mergePrefixIntoBody,
};
