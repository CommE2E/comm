// @flow

import invariant from 'invariant';
import _maxBy from 'lodash/fp/maxBy';

import { shimUploadURI, multimediaMessagePreview } from '../media/media-utils';
import { userIDsToRelativeUserInfos } from '../selectors/user-selectors';
import type { PlatformDetails } from '../types/device-types';
import type { Media, Image, Video } from '../types/media-types';
import {
  type MessageInfo,
  type RawMessageInfo,
  type RobotextMessageInfo,
  type PreviewableMessageInfo,
  type RawMultimediaMessageInfo,
  type MessageData,
  type MessageType,
  type MessageTruncationStatus,
  type MultimediaMessageData,
  type MessageStore,
  messageTypes,
  messageTruncationStatus,
} from '../types/message-types';
import type { CreateSidebarMessageInfo } from '../types/message/create-sidebar';
import type { CreateThreadMessageInfo } from '../types/message/create-thread';
import type {
  ImagesMessageData,
  RawImagesMessageInfo,
} from '../types/message/images';
import type {
  MediaMessageData,
  RawMediaMessageInfo,
} from '../types/message/media';
import { type ThreadInfo, threadTypes } from '../types/thread-types';
import type { RelativeUserInfo, UserInfos } from '../types/user-types';
import { prettyDate } from '../utils/date-utils';
import { codeBlockRegex } from './markdown';
import { messageSpecs } from './messages/message-specs';
import { stringForUser } from './user-utils';
import { hasMinCodeVersion } from './version-utils';

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

function robotextForUser(user: RelativeUserInfo): string {
  if (user.isViewer) {
    return 'you';
  } else if (user.username) {
    return `<${encodeURI(user.username)}|u${user.id}>`;
  } else {
    return 'anonymous';
  }
}

function robotextForUsers(users: RelativeUserInfo[]): string {
  if (users.length === 1) {
    return robotextForUser(users[0]);
  } else if (users.length === 2) {
    return `${robotextForUser(users[0])} and ${robotextForUser(users[1])}`;
  } else if (users.length === 3) {
    return (
      `${robotextForUser(users[0])}, ${robotextForUser(users[1])}, ` +
      `and ${robotextForUser(users[2])}`
    );
  } else {
    return (
      `${robotextForUser(users[0])}, ${robotextForUser(users[1])}, ` +
      `and ${users.length - 2} others`
    );
  }
}

function encodedThreadEntity(threadID: string, text: string): string {
  return `<${text}|t${threadID}>`;
}

function newThreadRobotext(
  messageInfo: CreateThreadMessageInfo,
  creator: string,
) {
  let text = `created ${encodedThreadEntity(
    messageInfo.threadID,
    `this thread`,
  )}`;
  const parentThread = messageInfo.initialThreadState.parentThreadInfo;
  if (parentThread) {
    text +=
      ' as a child of ' +
      `<${encodeURI(parentThread.uiName)}|t${parentThread.id}>`;
  }
  if (messageInfo.initialThreadState.name) {
    text += ` with the name "${encodeURI(
      messageInfo.initialThreadState.name,
    )}"`;
  }
  const users = messageInfo.initialThreadState.otherMembers;
  if (users.length !== 0) {
    const initialUsersString = robotextForUsers(users);
    text += ` and added ${initialUsersString}`;
  }
  return `${creator} ${text}`;
}

function newSidebarRobotext(
  messageInfo: CreateSidebarMessageInfo,
  creator: string,
) {
  let text = `started ${encodedThreadEntity(
    messageInfo.threadID,
    `this sidebar`,
  )}`;
  const users = messageInfo.initialThreadState.otherMembers.filter(
    (member) => member.id !== messageInfo.sourceMessageAuthor.id,
  );
  if (users.length !== 0) {
    const initialUsersString = robotextForUsers(users);
    text += ` and added ${initialUsersString}`;
  }
  return `${creator} ${text}`;
}

function robotextForMessageInfo(
  messageInfo: RobotextMessageInfo,
  threadInfo: ThreadInfo,
): string {
  const creator = robotextForUser(messageInfo.creator);
  if (messageInfo.type === messageTypes.CREATE_THREAD) {
    return newThreadRobotext(messageInfo, creator);
  } else if (messageInfo.type === messageTypes.ADD_MEMBERS) {
    const users = messageInfo.addedMembers;
    invariant(users.length !== 0, 'added who??');
    const addedUsersString = robotextForUsers(users);
    return `${creator} added ${addedUsersString}`;
  } else if (messageInfo.type === messageTypes.CREATE_SUB_THREAD) {
    const childName = messageInfo.childThreadInfo.name;
    const childNoun =
      messageInfo.childThreadInfo.type === threadTypes.SIDEBAR
        ? 'sidebar'
        : 'child thread';
    if (childName) {
      return (
        `${creator} created a ${childNoun}` +
        ` named "<${encodeURI(childName)}|t${messageInfo.childThreadInfo.id}>"`
      );
    } else {
      return (
        `${creator} created a ` +
        `<${childNoun}|t${messageInfo.childThreadInfo.id}>`
      );
    }
  } else if (messageInfo.type === messageTypes.CHANGE_SETTINGS) {
    let value;
    if (messageInfo.field === 'color') {
      value = `<#${messageInfo.value}|c${messageInfo.threadID}>`;
    } else {
      value = messageInfo.value;
    }
    return (
      `${creator} updated ` +
      `${encodedThreadEntity(messageInfo.threadID, 'the thread')}'s ` +
      `${messageInfo.field} to "${value}"`
    );
  } else if (messageInfo.type === messageTypes.REMOVE_MEMBERS) {
    const users = messageInfo.removedMembers;
    invariant(users.length !== 0, 'removed who??');
    const removedUsersString = robotextForUsers(users);
    return `${creator} removed ${removedUsersString}`;
  } else if (messageInfo.type === messageTypes.CHANGE_ROLE) {
    const users = messageInfo.members;
    invariant(users.length !== 0, 'changed whose role??');
    const usersString = robotextForUsers(users);
    const verb = threadInfo.roles[messageInfo.newRole].isDefault
      ? 'removed'
      : 'added';
    const noun = users.length === 1 ? 'an admin' : 'admins';
    return `${creator} ${verb} ${usersString} as ${noun}`;
  } else if (messageInfo.type === messageTypes.LEAVE_THREAD) {
    return (
      `${creator} left ` +
      encodedThreadEntity(messageInfo.threadID, 'this thread')
    );
  } else if (messageInfo.type === messageTypes.JOIN_THREAD) {
    return (
      `${creator} joined ` +
      encodedThreadEntity(messageInfo.threadID, 'this thread')
    );
  } else if (messageInfo.type === messageTypes.CREATE_ENTRY) {
    const date = prettyDate(messageInfo.date);
    return (
      `${creator} created an event scheduled for ${date}: ` +
      `"${messageInfo.text}"`
    );
  } else if (messageInfo.type === messageTypes.EDIT_ENTRY) {
    const date = prettyDate(messageInfo.date);
    return (
      `${creator} updated the text of an event scheduled for ` +
      `${date}: "${messageInfo.text}"`
    );
  } else if (messageInfo.type === messageTypes.DELETE_ENTRY) {
    const date = prettyDate(messageInfo.date);
    return (
      `${creator} deleted an event scheduled for ${date}: ` +
      `"${messageInfo.text}"`
    );
  } else if (messageInfo.type === messageTypes.RESTORE_ENTRY) {
    const date = prettyDate(messageInfo.date);
    return (
      `${creator} restored an event scheduled for ${date}: ` +
      `"${messageInfo.text}"`
    );
  } else if (messageInfo.type === messageTypes.UPDATE_RELATIONSHIP) {
    const target = robotextForUser(messageInfo.target);
    if (messageInfo.operation === 'request_sent') {
      return `${creator} sent ${target} a friend request`;
    } else if (messageInfo.operation === 'request_accepted') {
      const targetPossessive = messageInfo.target.isViewer
        ? 'your'
        : `${target}'s`;
      return `${creator} accepted ${targetPossessive} friend request`;
    }
    invariant(
      false,
      `Invalid operation ${messageInfo.operation} ` +
        `of message with type ${messageInfo.type}`,
    );
  } else if (messageInfo.type === messageTypes.CREATE_SIDEBAR) {
    return newSidebarRobotext(messageInfo, creator);
  } else if (messageInfo.type === messageTypes.UNSUPPORTED) {
    return `${creator} ${messageInfo.robotext}`;
  }
  invariant(false, `we're not aware of messageType ${messageInfo.type}`);
}

function robotextToRawString(robotext: string): string {
  return decodeURI(robotext.replace(/<([^<>|]+)\|[^<>|]+>/g, '$1'));
}

function createMessageInfo(
  rawMessageInfo: RawMessageInfo,
  viewerID: ?string,
  userInfos: UserInfos,
  threadInfos: { [id: string]: ThreadInfo },
): ?MessageInfo {
  const creatorInfo = userInfos[rawMessageInfo.creatorID];
  if (!creatorInfo) {
    return null;
  }
  const creator = {
    id: rawMessageInfo.creatorID,
    username: creatorInfo.username,
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

function sortMessageInfoList<T: MessageInfo | RawMessageInfo>(
  messageInfos: T[],
): T[] {
  return messageInfos.sort((a: T, b: T) => b.time - a.time);
}

function rawMessageInfoFromMessageData(
  messageData: MessageData,
  id: string,
): RawMessageInfo {
  const messageSpec = messageSpecs[messageData.type];
  invariant(
    messageSpec.rawMessageInfoFromMessageData,
    `we're not aware of messageType ${messageData.type}`,
  );
  return messageSpec.rawMessageInfoFromMessageData(messageData, id);
}

function mostRecentMessageTimestamp(
  messageInfos: RawMessageInfo[],
  previousTimestamp: number,
): number {
  if (messageInfos.length === 0) {
    return previousTimestamp;
  }
  return _maxBy('time')(messageInfos).time;
}

function messageTypeGeneratesNotifs(type: MessageType) {
  return (
    type !== messageTypes.JOIN_THREAD &&
    type !== messageTypes.LEAVE_THREAD &&
    type !== messageTypes.ADD_MEMBERS &&
    type !== messageTypes.REMOVE_MEMBERS &&
    type !== messageTypes.SIDEBAR_SOURCE
  );
}

function splitRobotext(robotext: string) {
  return robotext.split(/(<[^<>|]+\|[^<>|]+>)/g);
}

const robotextEntityRegex = /<([^<>|]+)\|([^<>|]+)>/;
function parseRobotextEntity(robotextPart: string) {
  const entityParts = robotextPart.match(robotextEntityRegex);
  invariant(entityParts && entityParts[1], 'malformed robotext');
  const rawText = decodeURI(entityParts[1]);
  const entityType = entityParts[2].charAt(0);
  const id = entityParts[2].substr(1);
  return { rawText, entityType, id };
}

function usersInMessageInfos(
  messageInfos: $ReadOnlyArray<MessageInfo | RawMessageInfo>,
): string[] {
  const userIDs = new Set();
  for (let messageInfo of messageInfos) {
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
  if (platformDetails && platformDetails.platform === 'web') {
    return [...rawMessageInfos];
  }
  return rawMessageInfos.map((rawMessageInfo) => {
    if (rawMessageInfo.type === messageTypes.IMAGES) {
      const shimmedRawMessageInfo = shimMediaMessageInfo(
        rawMessageInfo,
        platformDetails,
      );
      if (hasMinCodeVersion(platformDetails, 30)) {
        return shimmedRawMessageInfo;
      }
      const { id } = shimmedRawMessageInfo;
      invariant(id !== null && id !== undefined, 'id should be set on server');
      return {
        type: messageTypes.UNSUPPORTED,
        id,
        threadID: shimmedRawMessageInfo.threadID,
        creatorID: shimmedRawMessageInfo.creatorID,
        time: shimmedRawMessageInfo.time,
        robotext: multimediaMessagePreview(shimmedRawMessageInfo),
        unsupportedMessageInfo: shimmedRawMessageInfo,
      };
    } else if (rawMessageInfo.type === messageTypes.MULTIMEDIA) {
      const shimmedRawMessageInfo = shimMediaMessageInfo(
        rawMessageInfo,
        platformDetails,
      );
      // TODO figure out first native codeVersion supporting video playback
      if (hasMinCodeVersion(platformDetails, 62)) {
        return shimmedRawMessageInfo;
      }
      const { id } = shimmedRawMessageInfo;
      invariant(id !== null && id !== undefined, 'id should be set on server');
      return {
        type: messageTypes.UNSUPPORTED,
        id,
        threadID: shimmedRawMessageInfo.threadID,
        creatorID: shimmedRawMessageInfo.creatorID,
        time: shimmedRawMessageInfo.time,
        robotext: multimediaMessagePreview(shimmedRawMessageInfo),
        unsupportedMessageInfo: shimmedRawMessageInfo,
      };
    } else if (rawMessageInfo.type === messageTypes.UPDATE_RELATIONSHIP) {
      if (hasMinCodeVersion(platformDetails, 71)) {
        return rawMessageInfo;
      }
      const { id } = rawMessageInfo;
      invariant(id !== null && id !== undefined, 'id should be set on server');
      return {
        type: messageTypes.UNSUPPORTED,
        id,
        threadID: rawMessageInfo.threadID,
        creatorID: rawMessageInfo.creatorID,
        time: rawMessageInfo.time,
        robotext: 'performed a relationship action',
        unsupportedMessageInfo: rawMessageInfo,
      };
    } else if (rawMessageInfo.type === messageTypes.SIDEBAR_SOURCE) {
      // TODO determine min code version
      if (
        hasMinCodeVersion(platformDetails, 75) &&
        rawMessageInfo.sourceMessage
      ) {
        return rawMessageInfo;
      }
      const { id } = rawMessageInfo;
      invariant(id !== null && id !== undefined, 'id should be set on server');
      return {
        type: messageTypes.UNSUPPORTED,
        id,
        threadID: rawMessageInfo.threadID,
        creatorID: rawMessageInfo.creatorID,
        time: rawMessageInfo.time,
        robotext: 'first message in sidebar',
        unsupportedMessageInfo: rawMessageInfo,
      };
    } else if (rawMessageInfo.type === messageTypes.CREATE_SIDEBAR) {
      // TODO determine min code version
      if (hasMinCodeVersion(platformDetails, 75)) {
        return rawMessageInfo;
      }
      const { id } = rawMessageInfo;
      invariant(id !== null && id !== undefined, 'id should be set on server');
      return {
        type: messageTypes.UNSUPPORTED,
        id,
        threadID: rawMessageInfo.threadID,
        creatorID: rawMessageInfo.creatorID,
        time: rawMessageInfo.time,
        robotext: 'created a sidebar',
        unsupportedMessageInfo: rawMessageInfo,
      };
    }
    return rawMessageInfo;
  });
}

function shimMediaMessageInfo(
  rawMessageInfo: RawMultimediaMessageInfo,
  platformDetails: ?PlatformDetails,
): RawMultimediaMessageInfo {
  if (rawMessageInfo.type === messageTypes.IMAGES) {
    let uriChanged = false;
    const newMedia: Image[] = [];
    for (let singleMedia of rawMessageInfo.media) {
      const shimmedURI = shimUploadURI(singleMedia.uri, platformDetails);
      if (shimmedURI === singleMedia.uri) {
        newMedia.push(singleMedia);
      } else {
        newMedia.push(({ ...singleMedia, uri: shimmedURI }: Image));
        uriChanged = true;
      }
    }
    if (!uriChanged) {
      return rawMessageInfo;
    }
    return ({
      ...rawMessageInfo,
      media: newMedia,
    }: RawImagesMessageInfo);
  } else {
    let uriChanged = false;
    const newMedia: Media[] = [];
    for (let singleMedia of rawMessageInfo.media) {
      const shimmedURI = shimUploadURI(singleMedia.uri, platformDetails);
      if (shimmedURI === singleMedia.uri) {
        newMedia.push(singleMedia);
      } else if (singleMedia.type === 'photo') {
        newMedia.push(({ ...singleMedia, uri: shimmedURI }: Image));
        uriChanged = true;
      } else {
        newMedia.push(({ ...singleMedia, uri: shimmedURI }: Video));
        uriChanged = true;
      }
    }
    if (!uriChanged) {
      return rawMessageInfo;
    }
    return ({
      ...rawMessageInfo,
      media: newMedia,
    }: RawMediaMessageInfo);
  }
}

function messagePreviewText(
  messageInfo: PreviewableMessageInfo,
  threadInfo: ThreadInfo,
): string {
  if (
    messageInfo.type === messageTypes.IMAGES ||
    messageInfo.type === messageTypes.MULTIMEDIA
  ) {
    const creator = stringForUser(messageInfo.creator);
    const preview = multimediaMessagePreview(messageInfo);
    return `${creator} ${preview}`;
  }
  return robotextToRawString(robotextForMessageInfo(messageInfo, threadInfo));
}

type MediaMessageDataCreationInput = $ReadOnly<{
  threadID: string,
  creatorID: string,
  media: $ReadOnlyArray<Media>,
  localID?: ?string,
  time?: ?number,
  ...
}>;
function createMediaMessageData(
  input: MediaMessageDataCreationInput,
): MultimediaMessageData {
  let allMediaArePhotos = true;
  const photoMedia = [];
  for (let singleMedia of input.media) {
    if (singleMedia.type === 'video') {
      allMediaArePhotos = false;
      break;
    } else {
      photoMedia.push(singleMedia);
    }
  }

  const { localID, threadID, creatorID } = input;
  const time = input.time ? input.time : Date.now();
  let messageData;
  if (allMediaArePhotos) {
    messageData = ({
      type: messageTypes.IMAGES,
      threadID,
      creatorID,
      time,
      media: photoMedia,
    }: ImagesMessageData);
  } else {
    messageData = ({
      type: messageTypes.MULTIMEDIA,
      threadID,
      creatorID,
      time,
      media: input.media,
    }: MediaMessageData);
  }
  if (localID) {
    messageData.localID = localID;
  }
  return messageData;
}

type MediaMessageInfoCreationInput = $ReadOnly<{
  ...$Exact<MediaMessageDataCreationInput>,
  id?: ?string,
}>;
function createMediaMessageInfo(
  input: MediaMessageInfoCreationInput,
): RawMultimediaMessageInfo {
  const messageData = createMediaMessageData(input);
  // This conditional is for Flow
  let rawMessageInfo;
  if (messageData.type === messageTypes.IMAGES) {
    rawMessageInfo = ({
      ...messageData,
      type: messageTypes.IMAGES,
    }: RawImagesMessageInfo);
  } else {
    rawMessageInfo = ({
      ...messageData,
      type: messageTypes.MULTIMEDIA,
    }: RawMediaMessageInfo);
  }
  if (input.id) {
    rawMessageInfo.id = input.id;
  }
  return rawMessageInfo;
}

function stripLocalIDs(
  input: $ReadOnlyArray<RawMessageInfo>,
): RawMessageInfo[] {
  const output = [];
  for (let rawMessageInfo of input) {
    if (
      rawMessageInfo.localID === null ||
      rawMessageInfo.localID === undefined
    ) {
      output.push(rawMessageInfo);
      continue;
    }
    invariant(
      rawMessageInfo.id,
      'serverID should be set if localID is being stripped',
    );
    if (rawMessageInfo.type === messageTypes.TEXT) {
      const { localID, ...rest } = rawMessageInfo;
      output.push({ ...rest });
    } else if (rawMessageInfo.type === messageTypes.IMAGES) {
      const { localID, ...rest } = rawMessageInfo;
      output.push(({ ...rest }: RawImagesMessageInfo));
    } else if (rawMessageInfo.type === messageTypes.MULTIMEDIA) {
      const { localID, ...rest } = rawMessageInfo;
      output.push(({ ...rest }: RawMediaMessageInfo));
    } else {
      invariant(
        false,
        `message ${rawMessageInfo.id} of type ${rawMessageInfo.type} ` +
          `unexpectedly has localID`,
      );
    }
  }
  return output;
}

// Normally we call trim() to remove whitespace at the beginning and end of each
// message. However, our Markdown parser supports a "codeBlock" format where the
// user can indent each line to indicate a code block. If we match the
// corresponding RegEx, we'll only trim whitespace off the end.
function trimMessage(message: string) {
  message = message.replace(/^\n*/, '');
  return codeBlockRegex.exec(message) ? message.trimEnd() : message.trim();
}

function createMessageReply(message: string) {
  // add `>` to each line to include empty lines in the quote
  const quotedMessage = message.replace(/^/gm, '> ');
  return quotedMessage + '\n\n';
}

function getMostRecentNonLocalMessageID(
  threadInfo: ThreadInfo,
  messageStore: MessageStore,
): ?string {
  const thread = messageStore.threads[threadInfo.id];
  return thread?.messageIDs.find((id) => !id.startsWith('local'));
}

export {
  messageKey,
  messageID,
  robotextForMessageInfo,
  robotextToRawString,
  createMessageInfo,
  sortMessageInfoList,
  rawMessageInfoFromMessageData,
  mostRecentMessageTimestamp,
  messageTypeGeneratesNotifs,
  splitRobotext,
  parseRobotextEntity,
  usersInMessageInfos,
  combineTruncationStatuses,
  shimUnsupportedRawMessageInfos,
  messagePreviewText,
  createMediaMessageData,
  createMediaMessageInfo,
  stripLocalIDs,
  trimMessage,
  createMessageReply,
  getMostRecentNonLocalMessageID,
};
