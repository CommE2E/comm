// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
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

export const rawJoinThreadMessageInfoValidator: TInterface<RawJoinThreadMessageInfo> =
  tShape<RawJoinThreadMessageInfo>({
    type: tNumber(messageTypes.JOIN_THREAD),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    id: tID,
  });

export type JoinThreadMessageInfo = {
  type: 8,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
};
