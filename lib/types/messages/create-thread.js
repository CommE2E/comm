// @flow

import type { ThreadInfo, ThreadType } from '../thread-types.js';
import type { RelativeUserInfo } from '../user-types.js';

export type CreateThreadMessageData = {
  type: 1,
  threadID: string,
  creatorID: string,
  time: number,
  initialThreadState: {
    type: ThreadType,
    name: ?string,
    parentThreadID: ?string,
    color: string,
    memberIDs: string[],
  },
};

export type RawCreateThreadMessageInfo = {
  ...CreateThreadMessageData,
  id: string,
};

export type CreateThreadMessageInfo = {
  type: 1,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  initialThreadState: {
    type: ThreadType,
    name: ?string,
    parentThreadInfo: ?ThreadInfo,
    color: string,
    otherMembers: RelativeUserInfo[],
  },
};
