// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
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

export const rawLeaveThreadMessageInfoValidator: TInterface<RawLeaveThreadMessageInfo> =
  tShape<RawLeaveThreadMessageInfo>({
    type: tNumber(messageTypes.LEAVE_THREAD),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    id: tID,
  });

export type LeaveThreadMessageInfo = {
  type: 7,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
};
