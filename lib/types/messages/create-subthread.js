// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import type { ThreadInfo } from '../thread-types';
import type { RelativeUserInfo } from '../user-types';

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

export const rawCreateSubthreadMessageInfoValidator: TInterface = tShape({
  type: tNumber(3),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  childThreadID: tID,
  id: t.String,
});

export type CreateSubthreadMessageInfo = {
  type: 3,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  childThreadInfo: ThreadInfo,
};
