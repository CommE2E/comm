// @flow

import invariant from 'invariant';
import _orderBy from 'lodash/fp/orderBy.js';
import uuid from 'uuid';

import type {
  MessageInfo,
  MessageStore,
  RawComposableMessageInfo,
  RawMessageInfo,
} from '../types/message-types.js';
import type { RawEditMessageInfo } from '../types/messages/edit.js';
import type { RawReactionMessageInfo } from '../types/messages/reaction.js';

const localIDPrefix = 'local';

// Prefers localID
function messageKey(messageInfo: MessageInfo | RawMessageInfo): string {
  if (messageInfo.localID) {
    return messageInfo.localID;
  }
  invariant(messageInfo.id, 'localID should exist if ID does not');
  return messageInfo.id;
}

// Prefers serverID
function messageID(messageInfo: MessageInfo | RawMessageInfo): string {
  if (messageInfo.id) {
    return messageInfo.id;
  }
  invariant(messageInfo.localID, 'localID should exist if ID does not');
  return messageInfo.localID;
}

function findMessageIDMaxLength(messageIDs: $ReadOnlyArray<?string>): number {
  let result = 0;
  for (const id of messageIDs) {
    if (!id || id.startsWith(localIDPrefix)) {
      continue;
    }

    result = Math.max(result, id.length);
  }
  return result;
}

function extendMessageID(id: ?string, length: number): ?string {
  if (!id || id.startsWith(localIDPrefix)) {
    return id;
  }
  return id.padStart(length, '0');
}

function sortMessageInfoList<T: MessageInfo | RawMessageInfo>(
  messageInfos: $ReadOnlyArray<T>,
): T[] {
  const length = findMessageIDMaxLength(
    messageInfos.map(message => message?.id),
  );
  return _orderBy([
    'time',
    (message: T) => extendMessageID(message?.id ?? message?.localID, length),
  ])(['desc', 'desc'])(messageInfos);
}

const sortMessageIDs: (messages: {
  +[id: string]: RawMessageInfo,
}) => (messageIDs: $ReadOnlyArray<string>) => string[] =
  messages => messageIDs => {
    const length = findMessageIDMaxLength(messageIDs);
    return _orderBy([
      (id: string) => messages[id].time,
      (id: string) => extendMessageID(id, length),
    ])(['desc', 'desc'])(messageIDs);
  };

function stripLocalID(
  rawMessageInfo:
    | RawComposableMessageInfo
    | RawReactionMessageInfo
    | RawEditMessageInfo,
) {
  const { localID, ...rest } = rawMessageInfo;
  return rest;
}

function stripLocalIDs(
  input: $ReadOnlyArray<RawMessageInfo>,
): RawMessageInfo[] {
  const output = [];
  for (const rawMessageInfo of input) {
    if (rawMessageInfo.localID) {
      invariant(
        rawMessageInfo.id,
        'serverID should be set if localID is being stripped',
      );
      output.push(stripLocalID(rawMessageInfo));
    } else {
      output.push(rawMessageInfo);
    }
  }
  return output;
}

function getMostRecentNonLocalMessageID(
  threadID: string,
  messageStore: MessageStore,
): ?string {
  const thread = messageStore.threads[threadID];
  return thread?.messageIDs.find(id => !id.startsWith(localIDPrefix));
}

function getOldestNonLocalMessageID(
  threadID: string,
  messageStore: MessageStore,
): ?string {
  const thread = messageStore.threads[threadID];
  if (!thread) {
    return thread;
  }
  const { messageIDs } = thread;
  for (let i = messageIDs.length - 1; i >= 0; i--) {
    const id = messageIDs[i];
    if (!id.startsWith(localIDPrefix)) {
      return id;
    }
  }
  return undefined;
}

function getNextLocalID(): string {
  const nextLocalID = uuid.v4();
  return `${localIDPrefix}${nextLocalID}`;
}

function getIDFromLocalID(localID: string): string {
  return localID.replace(localIDPrefix, '');
}

const farcasterIDPrefix = 'FARCASTER#';

function farcasterThreadIDFromConversationID(conversationID: string): string {
  return `${farcasterIDPrefix}${conversationID}`;
}

function conversationIDFromFarcasterThreadID(threadID: string): string {
  return threadID.replace(farcasterIDPrefix, '');
}

const farcasterUserIDPrefix = 'FID#';

function userIDFromFID(farcasterID: string): string {
  return `${farcasterUserIDPrefix}${farcasterID}`;
}

function extractFIDFromUserID(userID: string): ?string {
  if (!userID.startsWith(farcasterUserIDPrefix)) {
    return null;
  }

  return userID.replace(farcasterUserIDPrefix, '');
}

export {
  getNextLocalID,
  getOldestNonLocalMessageID,
  getMostRecentNonLocalMessageID,
  stripLocalIDs,
  sortMessageIDs,
  sortMessageInfoList,
  messageID,
  messageKey,
  localIDPrefix,
  getIDFromLocalID,
  farcasterIDPrefix,
  farcasterThreadIDFromConversationID,
  conversationIDFromFarcasterThreadID,
  userIDFromFID,
  extractFIDFromUserID,
};
