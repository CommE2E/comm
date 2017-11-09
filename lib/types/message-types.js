// @flow

import type { ThreadInfo, VisibilityRules } from './thread-types';
import { threadInfoPropType, visibilityRulesPropType } from './thread-types';
import type { RelativeUserInfo } from './user-types';
import { relativeUserInfoPropType } from './user-types';

import invariant from 'invariant';
import PropTypes from 'prop-types';

export type MessageType = 0 | 1 | 2 | 3 | 4 | 5;
export const messageType = {
  TEXT: 0,
  CREATE_THREAD: 1,
  ADD_MEMBERS: 2,
  CREATE_SUB_THREAD: 3,
  CHANGE_SETTINGS: 4,
  REMOVE_MEMBERS: 5,
};
export function assertMessageType(
  ourMessageType: number,
): MessageType {
  invariant(
    ourMessageType === 0 ||
      ourMessageType === 1 ||
      ourMessageType === 2 ||
      ourMessageType === 3 ||
      ourMessageType === 4 ||
      ourMessageType === 5,
    "number is not MessageType enum",
  );
  return ourMessageType;
}

export type RawTextMessageInfo = {|
  type: 0,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creatorID: string,
  time: number, // millisecond timestamp
  text: string,
|};

type RawInitialThreadState = {|
  name: string,
  parentThreadID: ?string,
  visibilityRules: VisibilityRules,
  color: string,
  memberIDs: string[],
|};

export type RawThreadCreationInfo = {|
  type: 1,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  initialThreadState: RawInitialThreadState,
|};

export type RawAddMembersInfo = {|
  type: 2,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  addedUserIDs: string[],
|};

export type RawSubThreadCreationInfo = {|
  type: 3,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  childThreadID: string,
|};

export type RawChangeThreadSettingsInfo = {|
  type: 4,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  field: string,
  value: string | number,
|};

export type RawRemoveMembersInfo = {|
  type: 5,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  removedUserIDs: string[],
|};

export type RawMessageInfo =
  RawTextMessageInfo |
  RawThreadCreationInfo |
  RawAddMembersInfo |
  RawSubThreadCreationInfo |
  RawChangeThreadSettingsInfo |
  RawRemoveMembersInfo;

export type TextMessageInfo = {|
  type: 0,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creator: RelativeUserInfo,
  time: number, // millisecond timestamp
  text: string,
|};

type InitialThreadState = {|
  name: string,
  parentThreadInfo: ?ThreadInfo,
  visibilityRules: VisibilityRules,
  color: string,
  otherMembers: RelativeUserInfo[],
|};
export type RobotextMessageInfo = {|
  type: 1,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  initialThreadState: InitialThreadState,
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
|};

export type MessageInfo = TextMessageInfo | RobotextMessageInfo;

export const messageInfoPropType = PropTypes.oneOfType([
  PropTypes.shape({
    type: PropTypes.oneOf([0]).isRequired,
    id: PropTypes.string,
    localID: PropTypes.string,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([1]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    initialThreadState: PropTypes.shape({
      name: PropTypes.string.isRequired,
      parentThreadInfo: threadInfoPropType,
      visibilityRules: visibilityRulesPropType.isRequired,
      color: PropTypes.string.isRequired,
      otherMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
    }).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([2]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    addedMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([3]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    childThreadInfo: threadInfoPropType.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([4]).isRequired,
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
    type: PropTypes.oneOf([5]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    removedMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
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

export type MessageTruncationStatus = "truncated" | "unchanged" | "exhaustive";
export const messageTruncationStatus = {
  TRUNCATED: "truncated",
  UNCHANGED: "unchanged",
  EXHAUSTIVE: "exhaustive",
};
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
