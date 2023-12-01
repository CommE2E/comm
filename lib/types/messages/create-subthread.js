// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
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

export const rawCreateSubthreadMessageInfoValidator: TInterface<RawCreateSubthreadMessageInfo> =
  tShape<RawCreateSubthreadMessageInfo>({
    type: tNumber(messageTypes.CREATE_SUB_THREAD),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    childThreadID: tID,
    id: tID,
  });

export type CreateSubthreadMessageInfo = {
  type: 3,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  childThreadInfo: ThreadInfo,
};
