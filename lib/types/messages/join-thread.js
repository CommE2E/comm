// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type JoinThreadMessageData = {
  type: 8,
  threadID: string,
  creatorID: string,
  time: number,
};

export type RawJoinThreadMessageInfo = {
  ...JoinThreadMessageData,
  id: string,
};

export type JoinThreadMessageInfo = {
  type: 8,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
};
