// @flow

import type { ThreadInfo, VisibilityRules } from './thread-types';
import { threadInfoPropType, visibilityRulesPropType } from './thread-types';
import type { RelativeUserInfo } from './user-types';
import { relativeUserInfoPropType } from './user-types';

import invariant from 'invariant';
import PropTypes from 'prop-types';

export const messageType = Object.freeze({
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
});
export type MessageType = $Values<typeof messageType>;
export function assertMessageType(
  ourMessageType: number,
): MessageType {
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
      ourMessageType === 12,
    "number is not MessageType enum",
  );
  return ourMessageType;
}

// *MessageData = passed to createMessages function to insert into database
// Raw*MessageInfo = used by server, and contained in client's local store
// *MessageInfo = used by client in UI code

type TextMessageData = {|
  type: 0,
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
    name: ?string,
    parentThreadID: ?string,
    visibilityRules: VisibilityRules,
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
  | RestoreEntryMessageData;

export type RawTextMessageInfo = {|
  ...TextMessageData,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
|};
type RawRobotextMessageInfo = {|
  ...CreateThreadMessageData,
  id: string,
|} | {|
  ...AddMembersMessageData,
  id: string,
|} | {|
  ...CreateSubthreadMessageData,
  id: string,
|} | {|
  ...ChangeSettingsMessageData,
  id: string,
|} | {|
  ...RemoveMembersMessageData,
  id: string,
|} | {|
  ...ChangeRoleMessageData,
  id: string,
|} | {|
  ...LeaveThreadMessageData,
  id: string,
|} | {|
  ...JoinThreadMessageData,
  id: string,
|} | {|
  ...CreateEntryMessageData,
  id: string,
|} | {|
  ...EditEntryMessageData,
  id: string,
|} | {|
  ...DeleteEntryMessageData,
  id: string,
|} | {|
  ...RestoreEntryMessageData,
  id: string,
|};
export type RawMessageInfo = RawTextMessageInfo | RawRobotextMessageInfo;

export type TextMessageInfo = {|
  type: 0,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creator: RelativeUserInfo,
  time: number, // millisecond timestamp
  text: string,
|};
export type RobotextMessageInfo = {|
  type: 1,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  initialThreadState: {|
    name: ?string,
    parentThreadInfo: ?ThreadInfo,
    visibilityRules: VisibilityRules,
    color: string,
    otherMembers: RelativeUserInfo[],
  |},
|} | {|
  type: 2,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  addedMembers: RelativeUserInfo[],
|} | {|
  type: 3,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  childThreadInfo: ThreadInfo,
|} | {|
  type: 4,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  field: string,
  value: string | number,
|} | {|
  type: 5,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  removedMembers: RelativeUserInfo[],
|} | {|
  type: 6,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  members: RelativeUserInfo[],
  newRole: string,
|} | {|
  type: 7,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
|} | {|
  type: 8,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
|} | {|
  type: 9,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
|} | {|
  type: 10,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
|} | {|
  type: 11,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
|} | {|
  type: 12,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
|};
export type MessageInfo = TextMessageInfo | RobotextMessageInfo;

export const messageInfoPropType = PropTypes.oneOfType([
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.TEXT ]).isRequired,
    id: PropTypes.string,
    localID: PropTypes.string,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.CREATE_THREAD ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    initialThreadState: PropTypes.shape({
      name: PropTypes.string,
      parentThreadInfo: threadInfoPropType,
      visibilityRules: visibilityRulesPropType.isRequired,
      color: PropTypes.string.isRequired,
      otherMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
    }).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.ADD_MEMBERS ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    addedMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.CREATE_SUB_THREAD ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    childThreadInfo: threadInfoPropType.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.CHANGE_SETTINGS ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    field: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.REMOVE_MEMBERS ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    removedMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.CHANGE_ROLE ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    members: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
    newRole: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.LEAVE_THREAD ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.JOIN_THREAD ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.CREATE_ENTRY ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    entryID: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.EDIT_ENTRY ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    entryID: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.DELETE_ENTRY ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    entryID: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.RESTORE_ENTRY ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    entryID: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }),
]);

export type ThreadMessageInfo = {|
  messageIDs: string[],
  startReached: bool,
  lastNavigatedTo: number, // millisecond timestamp
  lastPruned: number, // millisecond timestamp
|};

export type MessageStore = {|
  messages: {[id: string]: RawMessageInfo},
  threads: {[threadID: string]: ThreadMessageInfo},
|};

export const messageTruncationStatus = Object.freeze({
  TRUNCATED: "truncated",
  UNCHANGED: "unchanged",
  EXHAUSTIVE: "exhaustive",
});
export type MessageTruncationStatus = $Values<typeof messageTruncationStatus>;
export function assertMessageTruncationStatus(
  ourMessageTruncationStatus: string,
): MessageTruncationStatus {
  invariant(
    ourMessageTruncationStatus === "truncated" ||
      ourMessageTruncationStatus === "unchanged" ||
      ourMessageTruncationStatus === "exhaustive",
    "string is not ourMessageTruncationStatus enum",
  );
  return ourMessageTruncationStatus;
}

export type TextMessageCreationInfo = {|
  threadID: string,
  text: string,
|};
