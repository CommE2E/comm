// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type LeaveThreadMessageData = {
  type: 7,
  threadID: string,
  creatorID: string,
  time: number,
};

export type RawLeaveThreadMessageInfo = {
  ...LeaveThreadMessageData,
  id: string,
};

export type LeaveThreadMessageInfo = {
  type: 7,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
};
