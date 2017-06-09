// @flow

import invariant from 'invariant';
import PropTypes from 'prop-types';

export type MessageInfo = {
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  text: string,
  creator: ?string,
  creatorID: string,
  time: number, // millisecond timestamp
};

export const messageInfoPropType = PropTypes.shape({
  id: PropTypes.string,
  localID: PropTypes.string,
  threadID: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  creator: PropTypes.string,
  time: PropTypes.number.isRequired,
});

export type ThreadMessageInfo = {
  messageIDs: string[],
  startReached: bool,
  lastNavigatedTo: number, // millisecond timestamp
  lastPruned: number, // millisecond timestamp
};

export type MessageStore = {
  messages: {[id: string]: MessageInfo},
  threads: {[threadID: string]: ThreadMessageInfo},
  currentAsOf: number, // millisecond timestamp
};

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
