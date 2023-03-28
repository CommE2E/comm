// @flow

import invariant from 'invariant';
import _maxBy from 'lodash/fp/maxBy.js';
import _orderBy from 'lodash/fp/orderBy.js';
import * as React from 'react';

import { codeBlockRegex, type ParserRules } from './markdown.js';
import type { CreationSideEffectsFunc } from './messages/message-spec.js';
import { messageSpecs } from './messages/message-specs.js';
import { threadIsGroupChat } from './thread-utils.js';
import { useStringForUser } from '../hooks/ens-cache.js';
import { userIDsToRelativeUserInfos } from '../selectors/user-selectors.js';
import { type PlatformDetails, isWebPlatform } from '../types/device-types.js';
import type { Media } from '../types/media-types.js';
import {
  type MessageInfo,
  type RawMessageInfo,
  type RobotextMessageInfo,
  type RawMultimediaMessageInfo,
  type MessageData,
  type MessageTruncationStatus,
  type MultimediaMessageData,
  type MessageStore,
  type ComposableMessageInfo,
  messageTypes,
  messageTruncationStatus,
  type RawComposableMessageInfo,
  type ThreadMessageInfo,
} from '../types/message-types.js';
import type { ImagesMessageData } from '../types/messages/images.js';
import type { MediaMessageData } from '../types/messages/media.js';
import type {
  RawReactionMessageInfo,
  ReactionMessageInfo,
} from '../types/messages/reaction.js';
import { type ThreadInfo } from '../types/thread-types.js';
import type { UserInfos } from '../types/user-types.js';
import {
  type EntityText,
  useEntityTextAsString,
} from '../utils/entity-text.js';

const localIDPrefix = 'local';

const defaultMediaMessageOptions = Object.freeze({});

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

function robotextForMessageInfo(
  messageInfo: RobotextMessageInfo,
  threadInfo: ?ThreadInfo,
): EntityText {
  const messageSpec = messageSpecs[messageInfo.type];
  invariant(
    messageSpec.robotext,
    `we're not aware of messageType ${messageInfo.type}`,
  );
  return messageSpec.robotext(messageInfo, { threadInfo });
}

function createMessageInfo(
  rawMessageInfo: RawMessageInfo,
  viewerID: ?string,
  userInfos: UserInfos,
  threadInfos: { +[id: string]: ThreadInfo },
): ?MessageInfo {
  const creatorInfo = userInfos[rawMessageInfo.creatorID];
  const creator = {
    id: rawMessageInfo.creatorID,
    username: creatorInfo ? creatorInfo.username : 'anonymous',
    isViewer: rawMessageInfo.creatorID === viewerID,
  };

  const createRelativeUserInfos = (userIDs: $ReadOnlyArray<string>) =>
    userIDsToRelativeUserInfos(userIDs, viewerID, userInfos);
  const createMessageInfoFromRaw = (rawInfo: RawMessageInfo) =>
    createMessageInfo(rawInfo, viewerID, userInfos, threadInfos);

  const messageSpec = messageSpecs[rawMessageInfo.type];

  return messageSpec.createMessageInfo(rawMessageInfo, creator, {
    threadInfos,
    createMessageInfoFromRaw,
    createRelativeUserInfos,
  });
}

type LengthResult = {
  +local: number,
  +realized: number,
};
function findMessageIDMaxLengths(
  messageIDs: $ReadOnlyArray<?string>,
): LengthResult {
  const result = {
    local: 0,
    realized: 0,
  };
  for (const id of messageIDs) {
    if (!id) {
      continue;
    }
    if (id.startsWith(localIDPrefix)) {
      result.local = Math.max(result.local, id.length - localIDPrefix.length);
    } else {
      result.realized = Math.max(result.realized, id.length);
    }
  }
  return result;
}

function extendMessageID(id: ?string, lengths: LengthResult): ?string {
  if (!id) {
    return id;
  }
  if (id.startsWith(localIDPrefix)) {
    const zeroPaddedID = id
      .substr(localIDPrefix.length)
      .padStart(lengths.local, '0');
    return `${localIDPrefix}${zeroPaddedID}`;
  }
  return id.padStart(lengths.realized, '0');
}

function sortMessageInfoList<T: MessageInfo | RawMessageInfo>(
  messageInfos: $ReadOnlyArray<T>,
): T[] {
  const lengths = findMessageIDMaxLengths(
    messageInfos.map(message => message?.id),
  );
  return _orderBy([
    'time',
    (message: T) => extendMessageID(message?.id, lengths),
  ])(['desc', 'desc'])(messageInfos);
}

const sortMessageIDs: (messages: { +[id: string]: RawMessageInfo }) => (
  messageIDs: $ReadOnlyArray<string>,
) => string[] = messages => messageIDs => {
  const lengths = findMessageIDMaxLengths(messageIDs);
  return _orderBy([
    (id: string) => messages[id].time,
    (id: string) => extendMessageID(id, lengths),
  ])(['desc', 'desc'])(messageIDs);
};

function rawMessageInfoFromMessageData(
  messageData: MessageData,
  id: ?string,
): RawMessageInfo {
  const messageSpec = messageSpecs[messageData.type];
  invariant(
    messageSpec.rawMessageInfoFromMessageData,
    `we're not aware of messageType ${messageData.type}`,
  );
  return messageSpec.rawMessageInfoFromMessageData(messageData, id);
}

function mostRecentMessageTimestamp(
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
  previousTimestamp: number,
): number {
  if (messageInfos.length === 0) {
    return previousTimestamp;
  }
  return _maxBy('time')(messageInfos).time;
}

function usersInMessageInfos(
  messageInfos: $ReadOnlyArray<MessageInfo | RawMessageInfo>,
): string[] {
  const userIDs = new Set();
  for (const messageInfo of messageInfos) {
    if (messageInfo.creatorID) {
      userIDs.add(messageInfo.creatorID);
    } else if (messageInfo.creator) {
      userIDs.add(messageInfo.creator.id);
    }
  }
  return [...userIDs];
}

function combineTruncationStatuses(
  first: MessageTruncationStatus,
  second: ?MessageTruncationStatus,
): MessageTruncationStatus {
  if (
    first === messageTruncationStatus.EXHAUSTIVE ||
    second === messageTruncationStatus.EXHAUSTIVE
  ) {
    return messageTruncationStatus.EXHAUSTIVE;
  } else if (
    first === messageTruncationStatus.UNCHANGED &&
    second !== null &&
    second !== undefined
  ) {
    return second;
  } else {
    return first;
  }
}

function shimUnsupportedRawMessageInfos(
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  platformDetails: ?PlatformDetails,
): RawMessageInfo[] {
  if (platformDetails && isWebPlatform(platformDetails.platform)) {
    return [...rawMessageInfos];
  }
  return rawMessageInfos.map(rawMessageInfo => {
    const { shimUnsupportedMessageInfo } = messageSpecs[rawMessageInfo.type];
    if (shimUnsupportedMessageInfo) {
      return shimUnsupportedMessageInfo(rawMessageInfo, platformDetails);
    }
    return rawMessageInfo;
  });
}

type MediaMessageDataCreationInput = {
  +threadID: string,
  +creatorID: string,
  +media: $ReadOnlyArray<Media>,
  +localID?: ?string,
  +time?: ?number,
  +sidebarCreation?: ?boolean,
  ...
};
function createMediaMessageData(
  input: MediaMessageDataCreationInput,
  options: {
    +forceMultimediaMessageType?: boolean,
  } = defaultMediaMessageOptions,
): MultimediaMessageData {
  let allMediaArePhotos = true;
  const photoMedia = [];
  for (const singleMedia of input.media) {
    if (singleMedia.type !== 'photo') {
      allMediaArePhotos = false;
      break;
    } else {
      photoMedia.push(singleMedia);
    }
  }

  const { localID, threadID, creatorID, sidebarCreation } = input;
  const { forceMultimediaMessageType = false } = options;
  const time = input.time ? input.time : Date.now();
  let messageData;
  if (allMediaArePhotos && !forceMultimediaMessageType) {
    messageData = ({
      type: messageTypes.IMAGES,
      threadID,
      creatorID,
      time,
      media: photoMedia,
    }: ImagesMessageData);
    if (localID) {
      messageData = { ...messageData, localID };
    }
    if (sidebarCreation) {
      messageData = { ...messageData, sidebarCreation };
    }
  } else {
    messageData = ({
      type: messageTypes.MULTIMEDIA,
      threadID,
      creatorID,
      time,
      media: input.media,
    }: MediaMessageData);
    if (localID) {
      messageData = { ...messageData, localID };
    }
    if (sidebarCreation) {
      messageData = { ...messageData, sidebarCreation };
    }
  }
  return messageData;
}

type MediaMessageInfoCreationInput = {
  ...$Exact<MediaMessageDataCreationInput>,
  +id?: ?string,
};
function createMediaMessageInfo(
  input: MediaMessageInfoCreationInput,
  options: {
    +forceMultimediaMessageType?: boolean,
  } = defaultMediaMessageOptions,
): RawMultimediaMessageInfo {
  const messageData = createMediaMessageData(input, options);
  const createRawMessageInfo =
    messageSpecs[messageData.type].rawMessageInfoFromMessageData;
  invariant(
    createRawMessageInfo,
    'multimedia message spec should have rawMessageInfoFromMessageData',
  );
  const result = createRawMessageInfo(messageData, input.id);
  invariant(
    result.type === messageTypes.MULTIMEDIA ||
      result.type === messageTypes.IMAGES,
    `media messageSpec returned MessageType ${result.type}`,
  );
  return result;
}

function stripLocalID(
  rawMessageInfo: RawComposableMessageInfo | RawReactionMessageInfo,
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

// Normally we call trim() to remove whitespace at the beginning and end of each
// message. However, our Markdown parser supports a "codeBlock" format where the
// user can indent each line to indicate a code block. If we match the
// corresponding RegEx, we'll only trim whitespace off the end.
function trimMessage(message: string): string {
  message = message.replace(/^\n*/, '');
  return codeBlockRegex.exec(message) ? message.trimEnd() : message.trim();
}

function createMessageQuote(message: string): string {
  // add `>` to each line to include empty lines in the quote
  return message.replace(/^/gm, '> ');
}

function createMessageReply(message: string): string {
  return createMessageQuote(message) + '\n\n';
}

function getMostRecentNonLocalMessageID(
  threadID: string,
  messageStore: MessageStore,
): ?string {
  const thread = messageStore.threads[threadID];
  return thread?.messageIDs.find(id => !id.startsWith(localIDPrefix));
}

function getMessageTitle(
  messageInfo:
    | ComposableMessageInfo
    | RobotextMessageInfo
    | ReactionMessageInfo,
  threadInfo: ThreadInfo,
  markdownRules: ParserRules,
): EntityText {
  const { messageTitle } = messageSpecs[messageInfo.type];
  if (messageTitle) {
    return messageTitle({ messageInfo, threadInfo, markdownRules });
  }

  invariant(
    messageInfo.type !== messageTypes.TEXT &&
      messageInfo.type !== messageTypes.IMAGES &&
      messageInfo.type !== messageTypes.MULTIMEDIA &&
      messageInfo.type !== messageTypes.REACTION,
    'messageTitle can only be auto-generated for RobotextMessageInfo',
  );
  return robotextForMessageInfo(messageInfo, threadInfo);
}

function mergeThreadMessageInfos(
  first: ThreadMessageInfo,
  second: ThreadMessageInfo,
  messages: { +[id: string]: RawMessageInfo },
): ThreadMessageInfo {
  let firstPointer = 0;
  let secondPointer = 0;
  const mergedMessageIDs = [];
  let firstCandidate = first.messageIDs[firstPointer];
  let secondCandidate = second.messageIDs[secondPointer];
  while (firstCandidate !== undefined || secondCandidate !== undefined) {
    if (firstCandidate === undefined) {
      mergedMessageIDs.push(secondCandidate);
      secondPointer++;
    } else if (secondCandidate === undefined) {
      mergedMessageIDs.push(firstCandidate);
      firstPointer++;
    } else if (firstCandidate === secondCandidate) {
      mergedMessageIDs.push(firstCandidate);
      firstPointer++;
      secondPointer++;
    } else {
      const firstMessage = messages[firstCandidate];
      const secondMessage = messages[secondCandidate];
      invariant(
        firstMessage && secondMessage,
        'message in messageIDs not present in MessageStore',
      );
      if (
        (firstMessage.id &&
          secondMessage.id &&
          firstMessage.id === secondMessage.id) ||
        (firstMessage.localID &&
          secondMessage.localID &&
          firstMessage.localID === secondMessage.localID)
      ) {
        mergedMessageIDs.push(firstCandidate);
        firstPointer++;
        secondPointer++;
      } else if (firstMessage.time < secondMessage.time) {
        mergedMessageIDs.push(secondCandidate);
        secondPointer++;
      } else {
        mergedMessageIDs.push(firstCandidate);
        firstPointer++;
      }
    }
    firstCandidate = first.messageIDs[firstPointer];
    secondCandidate = second.messageIDs[secondPointer];
  }
  return {
    messageIDs: mergedMessageIDs,
    startReached: first.startReached && second.startReached,
    lastNavigatedTo: Math.max(first.lastNavigatedTo, second.lastNavigatedTo),
    lastPruned: Math.max(first.lastPruned, second.lastPruned),
  };
}

type MessagePreviewPart = {
  +text: string,
  // unread has highest contrast, followed by primary, followed by secondary
  +style: 'unread' | 'primary' | 'secondary',
};
type MessagePreviewResult = {
  +message: MessagePreviewPart,
  +username: ?MessagePreviewPart,
};
function useMessagePreview(
  originalMessageInfo: ?MessageInfo,
  threadInfo: ThreadInfo,
  markdownRules: ParserRules,
): ?MessagePreviewResult {
  let messageInfo;
  if (
    originalMessageInfo &&
    originalMessageInfo.type === messageTypes.SIDEBAR_SOURCE
  ) {
    messageInfo = originalMessageInfo.sourceMessage;
  } else {
    messageInfo = originalMessageInfo;
  }

  const hasUsername =
    threadIsGroupChat(threadInfo) ||
    threadInfo.name !== '' ||
    messageInfo?.creator.isViewer;
  const shouldDisplayUser =
    messageInfo?.type === messageTypes.TEXT && hasUsername;

  const stringForUser = useStringForUser(
    shouldDisplayUser ? messageInfo?.creator : null,
  );

  const { unread } = threadInfo.currentUser;
  const username = React.useMemo(() => {
    if (!shouldDisplayUser) {
      return null;
    }
    invariant(
      stringForUser,
      'useStringForUser should only return falsey if pass null or undefined',
    );
    return {
      text: stringForUser,
      style: unread ? 'unread' : 'secondary',
    };
  }, [shouldDisplayUser, stringForUser, unread]);

  const messageTitleEntityText = React.useMemo(() => {
    if (!messageInfo) {
      return messageInfo;
    }
    return getMessageTitle(messageInfo, threadInfo, markdownRules);
  }, [messageInfo, threadInfo, markdownRules]);

  const threadID = threadInfo.id;
  const entityTextToStringParams = React.useMemo(
    () => ({
      threadID,
    }),
    [threadID],
  );
  const messageTitle = useEntityTextAsString(
    messageTitleEntityText,
    entityTextToStringParams,
  );

  const isTextMessage = messageInfo?.type === messageTypes.TEXT;
  const message = React.useMemo(() => {
    if (messageTitle === null || messageTitle === undefined) {
      return messageTitle;
    }

    let style;
    if (unread) {
      style = 'unread';
    } else if (isTextMessage) {
      style = 'primary';
    } else {
      style = 'secondary';
    }

    return { text: messageTitle, style };
  }, [messageTitle, unread, isTextMessage]);

  return React.useMemo(() => {
    if (!message) {
      return message;
    }
    return { message, username };
  }, [message, username]);
}

function useMessageCreationSideEffectsFunc<Info: RawMessageInfo>(
  messageType: $PropertyType<Info, 'type'>,
): CreationSideEffectsFunc<Info> {
  const messageSpec = messageSpecs[messageType];
  invariant(messageSpec, `we're not aware of messageType ${messageType}`);
  invariant(
    messageSpec.useCreationSideEffectsFunc,
    `no useCreationSideEffectsFunc in message spec for ${messageType}`,
  );
  return messageSpec.useCreationSideEffectsFunc();
}

export {
  localIDPrefix,
  messageKey,
  messageID,
  robotextForMessageInfo,
  createMessageInfo,
  sortMessageInfoList,
  sortMessageIDs,
  rawMessageInfoFromMessageData,
  mostRecentMessageTimestamp,
  usersInMessageInfos,
  combineTruncationStatuses,
  shimUnsupportedRawMessageInfos,
  createMediaMessageData,
  createMediaMessageInfo,
  stripLocalIDs,
  trimMessage,
  createMessageQuote,
  createMessageReply,
  getMostRecentNonLocalMessageID,
  getMessageTitle,
  mergeThreadMessageInfos,
  useMessagePreview,
  useMessageCreationSideEffectsFunc,
};
