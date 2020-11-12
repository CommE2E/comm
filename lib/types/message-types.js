// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  type ThreadType,
  threadTypePropType,
} from './thread-types';
import {
  type RelativeUserInfo,
  relativeUserInfoPropType,
  type UserInfos,
} from './user-types';
import { type Media, type Image, mediaPropType } from './media-types';

import invariant from 'invariant';
import PropTypes from 'prop-types';

export const messageTypes = Object.freeze({
  TEXT: 0,
  CREATE_THREAD: 1,
  ADD_MEMBERS: 2,
  CREATE_SUB_THREAD: 3,
  CHANGE_SETTINGS: 4,
  REMOVE_MEMBERS: 5,
  CHANGE_ROLE: 6,
  LEAVE_THREAD: 7,
  JOIN_THREAD: 8,
  CREATE_ENTRY: 9,
  EDIT_ENTRY: 10,
  DELETE_ENTRY: 11,
  RESTORE_ENTRY: 12,
  // When the server has a message to deliver that the client can't properly
  // render because the client is too old, the server will send this message
  // type instead. Consequently, there is no MessageData for UNSUPPORTED - just
  // a RawMessageInfo and a MessageInfo. Note that native/persist.js handles
  // converting these MessageInfos when the client is upgraded.
  UNSUPPORTED: 13,
  IMAGES: 14,
  MULTIMEDIA: 15,
  UPDATE_RELATIONSHIP: 16,
});
export type MessageType = $Values<typeof messageTypes>;
export function assertMessageType(ourMessageType: number): MessageType {
  invariant(
    ourMessageType === 0 ||
      ourMessageType === 1 ||
      ourMessageType === 2 ||
      ourMessageType === 3 ||
      ourMessageType === 4 ||
      ourMessageType === 5 ||
      ourMessageType === 6 ||
      ourMessageType === 7 ||
      ourMessageType === 8 ||
      ourMessageType === 9 ||
      ourMessageType === 10 ||
      ourMessageType === 11 ||
      ourMessageType === 12 ||
      ourMessageType === 13 ||
      ourMessageType === 14 ||
      ourMessageType === 15 ||
      ourMessageType === 16,
    'number is not MessageType enum',
  );
  return ourMessageType;
}

const composableMessageTypes = new Set([
  messageTypes.TEXT,
  messageTypes.IMAGES,
  messageTypes.MULTIMEDIA,
]);
export function isComposableMessageType(ourMessageType: MessageType): boolean {
  return composableMessageTypes.has(ourMessageType);
}
export function assertComposableMessageType(
  ourMessageType: MessageType,
): MessageType {
  invariant(
    isComposableMessageType(ourMessageType),
    'MessageType is not composed',
  );
  return ourMessageType;
}
export function messageDataLocalID(messageData: MessageData) {
  if (
    messageData.type !== messageTypes.TEXT &&
    messageData.type !== messageTypes.IMAGES &&
    messageData.type !== messageTypes.MULTIMEDIA
  ) {
    return null;
  }
  return messageData.localID;
}

const mediaMessageTypes = new Set([
  messageTypes.IMAGES,
  messageTypes.MULTIMEDIA,
]);
export function isMediaMessageType(ourMessageType: MessageType): boolean {
  return mediaMessageTypes.has(ourMessageType);
}
export function assetMediaMessageType(
  ourMessageType: MessageType,
): MessageType {
  invariant(isMediaMessageType(ourMessageType), 'MessageType is not media');
  return ourMessageType;
}

// *MessageData = passed to createMessages function to insert into database
// Raw*MessageInfo = used by server, and contained in client's local store
// *MessageInfo = used by client in UI code

export type TextMessageData = {|
  type: 0,
  localID?: string, // for optimistic creations. included by new clients
  threadID: string,
  creatorID: string,
  time: number,
  text: string,
|};
type CreateThreadMessageData = {|
  type: 1,
  threadID: string,
  creatorID: string,
  time: number,
  initialThreadState: {|
    type: ThreadType,
    name: ?string,
    parentThreadID: ?string,
    color: string,
    memberIDs: string[],
  |},
|};
type AddMembersMessageData = {|
  type: 2,
  threadID: string,
  creatorID: string,
  time: number,
  addedUserIDs: string[],
|};
type CreateSubthreadMessageData = {|
  type: 3,
  threadID: string,
  creatorID: string,
  time: number,
  childThreadID: string,
|};
type ChangeSettingsMessageData = {|
  type: 4,
  threadID: string,
  creatorID: string,
  time: number,
  field: string,
  value: string | number,
|};
type RemoveMembersMessageData = {|
  type: 5,
  threadID: string,
  creatorID: string,
  time: number,
  removedUserIDs: string[],
|};
type ChangeRoleMessageData = {|
  type: 6,
  threadID: string,
  creatorID: string,
  time: number,
  userIDs: string[],
  newRole: string,
|};
type LeaveThreadMessageData = {|
  type: 7,
  threadID: string,
  creatorID: string,
  time: number,
|};
type JoinThreadMessageData = {|
  type: 8,
  threadID: string,
  creatorID: string,
  time: number,
|};
type CreateEntryMessageData = {|
  type: 9,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
|};
type EditEntryMessageData = {|
  type: 10,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
|};
type DeleteEntryMessageData = {|
  type: 11,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
|};
type RestoreEntryMessageData = {|
  type: 12,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
|};
export type ImagesMessageData = {|
  type: 14,
  localID?: string, // for optimistic creations. included by new clients
  threadID: string,
  creatorID: string,
  time: number,
  media: $ReadOnlyArray<Image>,
|};
export type MediaMessageData = {|
  type: 15,
  localID?: string, // for optimistic creations. included by new clients
  threadID: string,
  creatorID: string,
  time: number,
  media: $ReadOnlyArray<Media>,
|};
export type UpdateRelationshipMessageData = {|
  +type: 16,
  +threadID: string,
  +creatorID: string,
  +targetID: string,
  +time: number,
  +operation: 'request_sent' | 'request_accepted',
|};
export type MessageData =
  | TextMessageData
  | CreateThreadMessageData
  | AddMembersMessageData
  | CreateSubthreadMessageData
  | ChangeSettingsMessageData
  | RemoveMembersMessageData
  | ChangeRoleMessageData
  | LeaveThreadMessageData
  | JoinThreadMessageData
  | CreateEntryMessageData
  | EditEntryMessageData
  | DeleteEntryMessageData
  | RestoreEntryMessageData
  | ImagesMessageData
  | MediaMessageData
  | UpdateRelationshipMessageData;

export type MultimediaMessageData = ImagesMessageData | MediaMessageData;

export type RawTextMessageInfo = {|
  ...TextMessageData,
  id?: string, // null if local copy without ID yet
|};
export type RawImagesMessageInfo = {|
  ...ImagesMessageData,
  id?: string, // null if local copy without ID yet
|};
export type RawMediaMessageInfo = {|
  ...MediaMessageData,
  id?: string, // null if local copy without ID yet
|};
export type RawMultimediaMessageInfo =
  | RawImagesMessageInfo
  | RawMediaMessageInfo;
export type RawComposableMessageInfo =
  | RawTextMessageInfo
  | RawMultimediaMessageInfo;

type RawRobotextMessageInfo =
  | {|
      ...CreateThreadMessageData,
      id: string,
    |}
  | {|
      ...AddMembersMessageData,
      id: string,
    |}
  | {|
      ...CreateSubthreadMessageData,
      id: string,
    |}
  | {|
      ...ChangeSettingsMessageData,
      id: string,
    |}
  | {|
      ...RemoveMembersMessageData,
      id: string,
    |}
  | {|
      ...ChangeRoleMessageData,
      id: string,
    |}
  | {|
      ...LeaveThreadMessageData,
      id: string,
    |}
  | {|
      ...JoinThreadMessageData,
      id: string,
    |}
  | {|
      ...CreateEntryMessageData,
      id: string,
    |}
  | {|
      ...EditEntryMessageData,
      id: string,
    |}
  | {|
      ...DeleteEntryMessageData,
      id: string,
    |}
  | {|
      ...RestoreEntryMessageData,
      id: string,
    |}
  | {|
      ...UpdateRelationshipMessageData,
      id: string,
    |}
  | {|
      type: 13,
      id: string,
      threadID: string,
      creatorID: string,
      time: number,
      robotext: string,
      unsupportedMessageInfo: Object,
    |};
export type RawMessageInfo = RawComposableMessageInfo | RawRobotextMessageInfo;

export type LocallyComposedMessageInfo = {
  localID: string,
  threadID: string,
  ...
};

export type TextMessageInfo = {|
  type: 0,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creator: RelativeUserInfo,
  time: number, // millisecond timestamp
  text: string,
|};
export type ImagesMessageInfo = {|
  type: 14,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creator: RelativeUserInfo,
  time: number, // millisecond timestamp
  media: $ReadOnlyArray<Image>,
|};
export type MediaMessageInfo = {|
  type: 15,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creator: RelativeUserInfo,
  time: number, // millisecond timestamp
  media: $ReadOnlyArray<Media>,
|};
export type MultimediaMessageInfo = ImagesMessageInfo | MediaMessageInfo;
export type ComposableMessageInfo = TextMessageInfo | MultimediaMessageInfo;

export type RobotextMessageInfo =
  | {|
      type: 1,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
      initialThreadState: {|
        type: ThreadType,
        name: ?string,
        parentThreadInfo: ?ThreadInfo,
        color: string,
        otherMembers: RelativeUserInfo[],
      |},
    |}
  | {|
      type: 2,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
      addedMembers: RelativeUserInfo[],
    |}
  | {|
      type: 3,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
      childThreadInfo: ThreadInfo,
    |}
  | {|
      type: 4,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
      field: string,
      value: string | number,
    |}
  | {|
      type: 5,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
      removedMembers: RelativeUserInfo[],
    |}
  | {|
      type: 6,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
      members: RelativeUserInfo[],
      newRole: string,
    |}
  | {|
      type: 7,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
    |}
  | {|
      type: 8,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
    |}
  | {|
      type: 9,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
      entryID: string,
      date: string,
      text: string,
    |}
  | {|
      type: 10,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
      entryID: string,
      date: string,
      text: string,
    |}
  | {|
      type: 11,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
      entryID: string,
      date: string,
      text: string,
    |}
  | {|
      type: 12,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
      entryID: string,
      date: string,
      text: string,
    |}
  | {|
      type: 13,
      id: string,
      threadID: string,
      creator: RelativeUserInfo,
      time: number,
      robotext: string,
      unsupportedMessageInfo: Object,
    |}
  | {|
      +type: 16,
      +id: string,
      +threadID: string,
      +creator: RelativeUserInfo,
      +target: RelativeUserInfo,
      +time: number,
      +operation: 'request_sent' | 'request_accepted',
    |};
export type PreviewableMessageInfo =
  | RobotextMessageInfo
  | MultimediaMessageInfo;

export type MessageInfo = ComposableMessageInfo | RobotextMessageInfo;

export const messageInfoPropType = PropTypes.oneOfType([
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.TEXT]).isRequired,
    id: PropTypes.string,
    localID: PropTypes.string,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.CREATE_THREAD]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    initialThreadState: PropTypes.shape({
      type: threadTypePropType.isRequired,
      name: PropTypes.string,
      parentThreadInfo: threadInfoPropType,
      color: PropTypes.string.isRequired,
      otherMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
    }).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.ADD_MEMBERS]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    addedMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.CREATE_SUB_THREAD]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    childThreadInfo: threadInfoPropType.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.CHANGE_SETTINGS]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    field: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.REMOVE_MEMBERS]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    removedMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.CHANGE_ROLE]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    members: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
    newRole: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.LEAVE_THREAD]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.JOIN_THREAD]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.CREATE_ENTRY]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    entryID: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.EDIT_ENTRY]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    entryID: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.DELETE_ENTRY]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    entryID: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.RESTORE_ENTRY]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    entryID: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.UNSUPPORTED]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    robotext: PropTypes.string.isRequired,
    unsupportedMessageInfo: PropTypes.object.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.IMAGES]).isRequired,
    id: PropTypes.string,
    localID: PropTypes.string,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    media: PropTypes.arrayOf(mediaPropType).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([messageTypes.MULTIMEDIA]).isRequired,
    id: PropTypes.string,
    localID: PropTypes.string,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    media: PropTypes.arrayOf(mediaPropType).isRequired,
  }),
  PropTypes.exact({
    type: PropTypes.oneOf([messageTypes.UPDATE_RELATIONSHIP]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    target: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    operation: PropTypes.oneOf(['request_sent', 'request_accepted']),
  }),
]);

export type ThreadMessageInfo = {|
  messageIDs: string[],
  startReached: boolean,
  lastNavigatedTo: number, // millisecond timestamp
  lastPruned: number, // millisecond timestamp
|};

// Tracks client-local information about a message that hasn't been assigned an
// ID by the server yet. As soon as the client gets an ack from the server for
// this message, it will clear the LocalMessageInfo.
export type LocalMessageInfo = {|
  sendFailed?: boolean,
|};

export const localMessageInfoPropType = PropTypes.shape({
  sendFailed: PropTypes.bool,
});

export type MessageStore = {|
  messages: { [id: string]: RawMessageInfo },
  threads: { [threadID: string]: ThreadMessageInfo },
  local: { [id: string]: LocalMessageInfo },
  currentAsOf: number,
|};

export const messageTruncationStatus = Object.freeze({
  // EXHAUSTIVE means we've reached the start of the thread. Either the result
  // set includes the very first message for that thread, or there is nothing
  // behind the cursor you queried for. Given that the client only ever issues
  // ranged queries whose range, when unioned with what is in state, represent
  // the set of all messages for a given thread, we can guarantee that getting
  // EXHAUSTIVE means the start has been reached.
  EXHAUSTIVE: 'exhaustive',
  // TRUNCATED is rare, and means that the server can't guarantee that the
  // result set for a given thread is contiguous with what the client has in its
  // state. If the client can't verify the contiguousness itself, it needs to
  // replace its Redux store's contents with what it is in this payload.
  //  1) getMessageInfosSince: Result set for thread is equal to max, and the
  //     truncation status isn't EXHAUSTIVE (ie. doesn't include the very first
  //     message).
  //  2) getMessageInfos: ThreadSelectionCriteria does not specify cursors, the
  //     result set for thread is equal to max, and the truncation status isn't
  //     EXHAUSTIVE. If cursors are specified, we never return truncated, since
  //     the cursor given us guarantees the contiguousness of the result set.
  // Note that in the reducer, we can guarantee contiguousness if there is any
  // intersection between messageIDs in the result set and the set currently in
  // the Redux store.
  TRUNCATED: 'truncated',
  // UNCHANGED means the result set is guaranteed to be contiguous with what the
  // client has in its state, but is not EXHAUSTIVE. Basically, it's anything
  // that isn't either EXHAUSTIVE or TRUNCATED.
  UNCHANGED: 'unchanged',
});
export type MessageTruncationStatus = $Values<typeof messageTruncationStatus>;
export function assertMessageTruncationStatus(
  ourMessageTruncationStatus: string,
): MessageTruncationStatus {
  invariant(
    ourMessageTruncationStatus === 'truncated' ||
      ourMessageTruncationStatus === 'unchanged' ||
      ourMessageTruncationStatus === 'exhaustive',
    'string is not ourMessageTruncationStatus enum',
  );
  return ourMessageTruncationStatus;
}
export type MessageTruncationStatuses = {
  [threadID: string]: MessageTruncationStatus,
};

export type ThreadCursors = { [threadID: string]: ?string };

export type ThreadSelectionCriteria = {|
  threadCursors?: ?ThreadCursors,
  joinedThreads?: ?boolean,
|};

export type FetchMessageInfosRequest = {|
  cursors: ThreadCursors,
  numberPerThread?: ?number,
|};
export type FetchMessageInfosResponse = {|
  rawMessageInfos: RawMessageInfo[],
  truncationStatuses: MessageTruncationStatuses,
  userInfos: UserInfos,
|};
export type FetchMessageInfosResult = {|
  rawMessageInfos: RawMessageInfo[],
  truncationStatuses: MessageTruncationStatuses,
|};
export type FetchMessageInfosPayload = {|
  threadID: string,
  rawMessageInfos: RawMessageInfo[],
  truncationStatus: MessageTruncationStatus,
|};
export type MessagesResponse = {|
  rawMessageInfos: RawMessageInfo[],
  truncationStatuses: MessageTruncationStatuses,
  currentAsOf: number,
|};
export const defaultNumberPerThread = 20;

export type SendMessageResponse = {|
  newMessageInfo: RawMessageInfo,
|};
export type SendMessageResult = {|
  id: string,
  time: number,
|};
export type SendMessagePayload = {|
  localID: string,
  serverID: string,
  threadID: string,
  time: number,
|};

export type SendTextMessageRequest = {|
  threadID: string,
  localID?: string,
  text: string,
|};
export type SendMultimediaMessageRequest = {|
  threadID: string,
  localID: string,
  mediaIDs: $ReadOnlyArray<string>,
|};

// Used for the message info included in log-in type actions
export type GenericMessagesResult = {|
  messageInfos: RawMessageInfo[],
  truncationStatus: MessageTruncationStatuses,
  watchedIDsAtRequestTime: $ReadOnlyArray<string>,
  currentAsOf: number,
|};

export type SaveMessagesPayload = {|
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  updatesCurrentAsOf: number,
|};

export type NewMessagesPayload = {|
  messagesResult: MessagesResponse,
|};

export type MessageStorePrunePayload = {|
  threadIDs: $ReadOnlyArray<string>,
|};
