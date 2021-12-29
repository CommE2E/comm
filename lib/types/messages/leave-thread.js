// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import type { RelativeUserInfo } from '../user-types';

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

export const rawLeaveThreadMessageInfoValidator: TInterface = tShape({
  type: tNumber(7),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  id: t.String,
});

export type LeaveThreadMessageInfo = {
  type: 7,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
};
