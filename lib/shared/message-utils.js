// @flow

import invariant from 'invariant';
import _maxBy from 'lodash/fp/maxBy.js';
import * as React from 'react';

import { codeBlockRegex, type ParserRules } from './markdown.js';
import type { CreationSideEffectsFunc } from './messages/message-spec.js';
import { messageSpecs } from './messages/message-specs.js';
import { threadIsGroupChat } from './thread-utils.js';
import { threadSpecs } from './threads/thread-specs.js';
import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMostRecentMessagesActionTypes,
} from '../actions/message-actions.js';
import { useStringForUser } from '../hooks/ens-cache.js';
import {
  useFetchMessagesBeforeCursor,
  useFetchMostRecentMessages,
  useOldestMessageServerID,
} from '../hooks/message-hooks.js';
import { extractKeyserverIDFromIDOptional } from '../keyserver-conn/keyserver-call-utils.js';
import { contentStringForMediaArray } from '../media/media-utils.js';
import { registerFetchKey } from '../reducers/loading-reducer.js';
import type { ChatMessageInfoItem } from '../selectors/chat-selectors.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import { userIDsToRelativeUserInfos } from '../selectors/user-selectors.js';
import { type PlatformDetails } from '../types/device-types.js';
import type { Media } from '../types/media-types.js';
import { messageTypes } from '../types/message-types-enum.js';
import type { ValidRawSidebarSourceMessageInfo, ValidSidebarSourceMessageInfo } from '../types/message-types.js';
import {
  type ComposableMessageInfo,
  type FetchMessageInfosPayload,
  type MessageData,
  type MessageInfo,
  messageTruncationStatus,
  type MultimediaMessageData,
  type RawMessageInfo,
  type RawMultimediaMessageInfo,
  type RobotextMessageInfo,
  type ThreadMessageInfo,
} from '../types/message-types.js';
import type { DeleteMessageInfo } from '../types/messages/delete.js';
import type { EditMessageInfo } from '../types/messages/edit.js';
import type { ImagesMessageData } from '../types/messages/images.js';
import type { MediaMessageData } from '../types/messages/media.js';
import type { ReactionMessageInfo } from '../types/messages/reaction.js';
import type {
  RawThreadInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { LegacyRawThreadInfo } from '../types/thread-types.js';
import type { UserInfos } from '../types/user-types.js';
import { getConfig } from '../utils/config.js';
import {
  type EntityText,
  ET,
  useEntityTextAsString,
} from '../utils/entity-text.js';
import { translateClientDBMessageInfoToRawMessageInfo } from '../utils/message-ops-utils.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

const defaultMediaMessageOptions = Object.freeze({});

function robotextForMessageInfo(
  messageInfo: RobotextMessageInfo,
  threadInfo: ?ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
): EntityText {
  const messageSpec = messageSpecs[messageInfo.type];
  invariant(
    messageSpec.robotext,
    `we're not aware of messageType ${messageInfo.type}`,
  );
  return messageSpec.robotext(messageInfo, { threadInfo, parentThreadInfo });
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
  const userIDs = new Set<string>();
  for (const messageInfo of messageInfos) {
    if (messageInfo.creatorID) {
      userIDs.add(messageInfo.creatorID);
    } else if (messageInfo.creator) {
      userIDs.add(messageInfo.creator.id);
    }
  }
  return [...userIDs];
}

function shimUnsupportedRawMessageInfos(
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  platformDetails: ?PlatformDetails,
): RawMessageInfo[] {
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

function getMessageTitle(
  messageInfo:
    | ComposableMessageInfo
    | RobotextMessageInfo
    | ReactionMessageInfo
    | EditMessageInfo
    | DeleteMessageInfo,
  threadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
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
      messageInfo.type !== messageTypes.REACTION &&
      messageInfo.type !== messageTypes.EDIT_MESSAGE &&
      messageInfo.type !== messageTypes.DELETE_MESSAGE,
    'messageTitle can only be auto-generated for RobotextMessageInfo',
  );
  return robotextForMessageInfo(messageInfo, threadInfo, parentThreadInfo);
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
  };
}

type MessagePreviewPart = {
  +text: string,
  // unread has highest contrast, followed by primary, followed by secondary
  +style: 'unread' | 'primary' | 'secondary',
};
export type MessagePreviewResult = {
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

  const { parentThreadID } = threadInfo;
  const parentThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );

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
    return getMessageTitle(
      messageInfo,
      threadInfo,
      parentThreadInfo,
      markdownRules,
    );
  }, [messageInfo, threadInfo, parentThreadInfo, markdownRules]);

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

function getPinnedContentFromMessage(targetMessage: RawMessageInfo): string {
  let pinnedContent;
  if (
    targetMessage.type === messageTypes.IMAGES ||
    targetMessage.type === messageTypes.MULTIMEDIA
  ) {
    pinnedContent = contentStringForMediaArray(targetMessage.media);
  } else {
    pinnedContent = 'a message';
  }

  return pinnedContent;
}

function modifyItemForResultScreen(
  item: ChatMessageInfoItem,
): ChatMessageInfoItem {
  if (item.messageInfoType === 'composable') {
    return {
      ...item,
      startsConversation: false,
      startsCluster: true,
      endsCluster: true,
      messageInfo: {
        ...item.messageInfo,
        creator: {
          ...item.messageInfo.creator,
          isViewer: false,
        },
      },
    };
  }
  return item;
}

function constructChangeRoleEntityText(
  affectedUsers: EntityText | string,
  roleName: ?string,
): EntityText {
  if (!roleName) {
    return ET`assigned ${affectedUsers} a new role`;
  }

  return ET`assigned ${affectedUsers} the "${roleName}" role`;
}

function isInvalidSidebarSource(
  message: RawMessageInfo | MessageInfo,
): boolean {
  return (
    (message.type === messageTypes.REACTION ||
      message.type === messageTypes.EDIT_MESSAGE ||
      message.type === messageTypes.SIDEBAR_SOURCE ||
      message.type === messageTypes.TOGGLE_PIN ||
      message.type === messageTypes.DELETE_MESSAGE) &&
    !messageSpecs[message.type].canBeSidebarSource
  );
}

function isValidRawSidebarSourceMessageInfo(
  message: RawMessageInfo,
): implies message is ValidRawSidebarSourceMessageInfo {
  return (
    message.type !== messageTypes.REACTION &&
    message.type !== messageTypes.EDIT_MESSAGE &&
    message.type !== messageTypes.SIDEBAR_SOURCE &&
    message.type !== messageTypes.TOGGLE_PIN &&
    message.type !== messageTypes.DELETE_MESSAGE &&
    messageSpecs[message.type].canBeSidebarSource
  );
}

function isValidSidebarSourceMessageInfo(
  message: MessageInfo,
): implies message is ValidSidebarSourceMessageInfo {
  return (
    message.type !== messageTypes.REACTION &&
    message.type !== messageTypes.EDIT_MESSAGE &&
    message.type !== messageTypes.SIDEBAR_SOURCE &&
    message.type !== messageTypes.TOGGLE_PIN &&
    message.type !== messageTypes.DELETE_MESSAGE &&
    messageSpecs[message.type].canBeSidebarSource
  );
}

// Prefer checking isInvalidPinSourceForThread below. This function doesn't
// check whether the user is attempting to pin a SIDEBAR_SOURCE in the context
// of its parent thread, so it's not suitable for permission checks. We only
// use it in the message-fetchers.js code where we don't have access to the
// RawThreadInfo and don't need to do permission checks.
function isInvalidPinSource(
  messageInfo: RawMessageInfo | MessageInfo,
): boolean {
  return !messageSpecs[messageInfo.type].canBePinned;
}

function isInvalidPinSourceForThread(
  messageInfo: RawMessageInfo | MessageInfo,
  threadInfo: LegacyRawThreadInfo | RawThreadInfo | ThreadInfo,
): boolean {
  const isValidPinSource = !isInvalidPinSource(messageInfo);
  const isFirstMessageInSidebar = threadInfo.sourceMessageID === messageInfo.id;
  return !isValidPinSource || isFirstMessageInSidebar;
}

function isUnableToBeRenderedIndependently(
  message: RawMessageInfo | MessageInfo,
): boolean {
  return messageSpecs[message.type].canBeRenderedIndependently === false;
}

function findNewestMessageTimePerKeyserver(
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
): { [keyserverID: string]: number } {
  const timePerKeyserver: { [keyserverID: string]: number } = {};

  for (const messageInfo of messageInfos) {
    const keyserverID = extractKeyserverIDFromIDOptional(messageInfo.threadID);

    if (
      keyserverID &&
      (!timePerKeyserver[keyserverID] ||
        timePerKeyserver[keyserverID] < messageInfo.time)
    ) {
      timePerKeyserver[keyserverID] = messageInfo.time;
    }
  }

  return timePerKeyserver;
}

export type FetchThickMessagesType = (
  threadID: string,
  limit: number,
  offset: number,
) => Promise<FetchMessageInfosPayload>;

const fetchThickThreadMessages: FetchThickMessagesType = async (
  threadID: string,
  limit: number,
  offset: number,
) => {
  const { sqliteAPI } = getConfig();
  const dbMessages = await sqliteAPI.fetchMessages(threadID, limit + 1, offset);
  const isFetchExhaustive = dbMessages.length !== limit + 1;
  const messagesToReturn = isFetchExhaustive
    ? dbMessages
    : dbMessages.slice(0, -1);
  const messages = messagesToReturn.map(
    translateClientDBMessageInfoToRawMessageInfo,
  );
  return {
    threadID,
    rawMessageInfos: messages,
    truncationStatus: isFetchExhaustive
      ? messageTruncationStatus.EXHAUSTIVE
      : messageTruncationStatus.UNCHANGED,
  };
};

type FetchMessagesOptions = {
  +numMessagesToFetch?: ?number,
};
function useFetchMessages(
  threadInfo: ThreadInfo,
): (options?: ?FetchMessagesOptions) => Promise<void> {
  const oldestMessageServerID = useOldestMessageServerID(threadInfo.id);
  const callFetchMessagesBeforeCursor = useFetchMessagesBeforeCursor();
  const callFetchMostRecentMessages = useFetchMostRecentMessages();
  const dispatchActionPromise = useDispatchActionPromise();

  React.useEffect(() => {
    registerFetchKey(fetchMessagesBeforeCursorActionTypes);
    registerFetchKey(fetchMostRecentMessagesActionTypes);
  }, []);

  const threadID = threadInfo.id;
  const messageIDs = useSelector(
    state => state.messageStore.threads[threadID]?.messageIDs,
  );

  return React.useCallback(
    async (options?: ?FetchMessagesOptions) => {
      const numMessagesToFetch = options?.numMessagesToFetch;

      await threadSpecs[threadInfo.type].protocol().fetchMessages(
        {
          numMessagesToFetch,
          threadID,
          currentNumberOfFetchedMessages: messageIDs?.length ?? 0,
          oldestMessageServerID,
        },
        {
          fetchThickThreadMessages,
          keyserverFetchMessagesBeforeCursor: callFetchMessagesBeforeCursor,
          keyserverFetchMostRecentMessages: callFetchMostRecentMessages,
          dispatchActionPromise,
        },
      );
    },
    [
      callFetchMessagesBeforeCursor,
      callFetchMostRecentMessages,
      dispatchActionPromise,
      messageIDs?.length,
      oldestMessageServerID,
      threadID,
      threadInfo.type,
    ],
  );
}

export {
  robotextForMessageInfo,
  createMessageInfo,
  rawMessageInfoFromMessageData,
  mostRecentMessageTimestamp,
  usersInMessageInfos,
  shimUnsupportedRawMessageInfos,
  createMediaMessageData,
  createMediaMessageInfo,
  trimMessage,
  createMessageQuote,
  createMessageReply,
  getMessageTitle,
  mergeThreadMessageInfos,
  useMessagePreview,
  useMessageCreationSideEffectsFunc,
  getPinnedContentFromMessage,
  modifyItemForResultScreen,
  constructChangeRoleEntityText,
  isInvalidSidebarSource,
  isValidRawSidebarSourceMessageInfo,
  isValidSidebarSourceMessageInfo,
  isInvalidPinSource,
  isInvalidPinSourceForThread,
  isUnableToBeRenderedIndependently,
  findNewestMessageTimePerKeyserver,
  useFetchMessages,
};
