// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import { messageTypes } from '../message-types-enum';
import type { RelativeUserInfo } from '../user-types';

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

export const rawJoinThreadMessageInfoValidator: TInterface = tShape({
  type: tNumber(messageTypes.JOIN_THREAD),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  id: t.String,
});

export type JoinThreadMessageInfo = {
  type: 8,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
};
