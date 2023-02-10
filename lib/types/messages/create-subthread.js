// @flow

import type { ThreadInfo } from '../thread-types.js';
import type { RelativeUserInfo } from '../user-types.js';

export type CreateSubthreadMessageData = {
  type: 3,
  threadID: string,
  creatorID: string,
  time: number,
  childThreadID: string,
};

export type RawCreateSubthreadMessageInfo = {
  ...CreateSubthreadMessageData,
  id: string,
};

export type CreateSubthreadMessageInfo = {
  type: 3,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  childThreadInfo: ThreadInfo,
};
