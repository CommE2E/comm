// @flow

import {
  type MessageTruncationStatus,
  messageTruncationStatus,
} from '../types/message-types.js';

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

export { combineTruncationStatuses };
