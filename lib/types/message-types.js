// @flow

import type { ThreadInfo, VisibilityRules } from './thread-types';

import invariant from 'invariant';
import PropTypes from 'prop-types';

export type MessageType = 0 | 1 | 2;
export const messageType = {
  TEXT: 0,
  CREATE_THREAD: 1,
  ADD_USER: 2,
};
export function assertMessageType(
  ourMessageType: number,
): MessageType {
  invariant(
    ourMessageType === 0 ||
      ourMessageType === 1 ||
      ourMessageType === 2,
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

export type RawMessageInfo =
  RawTextMessageInfo |
  RawThreadCreationInfo |
  {|
    type: 2,
    id: string,
    threadID: string,
    creatorID: string,
    time: number,
    addedUserIDs: string[],
  |};

export type TextMessageInfo = {|
  type: 0,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creator: ?string,
  isViewer: bool,
  time: number, // millisecond timestamp
  text: string,
|};

type InitialThreadState = {|
  name: string,
  parentThreadInfo: ?ThreadInfo,
  visibilityRules: VisibilityRules,
  color: string,
  memberIDs: string[],
|};
export type RobotextMessageInfo = {|
  type: 1,
  id: string,
  threadID: string,
  creator: ?string,
  isViewer: bool,
  time: number,
  initialThreadState: InitialThreadState,
|} | {|
  type: 2,
  id: string,
  threadID: string,
  creator: ?string,
  isViewer: bool,
  time: number,
  addedUsernames: string[],
|};

export type MessageInfo = TextMessageInfo | RobotextMessageInfo;

export const messageInfoPropType = PropTypes.oneOfType([
  PropTypes.shape({
    type: PropTypes.oneOf([0]).isRequired,
    id: PropTypes.string,
    localID: PropTypes.string,
    threadID: PropTypes.string.isRequired,
    creator: PropTypes.string,
    isViewer: PropTypes.bool.isRequired,
    time: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([1]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: PropTypes.string,
    isViewer: PropTypes.bool.isRequired,
    time: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([2]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: PropTypes.string,
    isViewer: PropTypes.bool.isRequired,
    time: PropTypes.number.isRequired,
    addedUsernames: PropTypes.arrayOf(PropTypes.string).isRequired,
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
