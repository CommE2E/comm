// @flow

import t, { type TInterface } from 'tcomb';

import { values } from '../../utils/objects.js';
import {
  tID,
  tNumber,
  tShape,
  tNumEnum,
} from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import {
  threadTypes,
  type ThreadInfo,
  type ThreadType,
} from '../thread-types.js';
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

export const rawCreateThreadMessageInfoValidator: TInterface<RawCreateThreadMessageInfo> =
  tShape<RawCreateThreadMessageInfo>({
    type: tNumber(messageTypes.CREATE_THREAD),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    initialThreadState: tShape({
      type: tNumEnum(values(threadTypes)),
      name: t.maybe(t.String),
      parentThreadID: t.maybe(tID),
      color: t.String,
      memberIDs: t.list(t.String),
    }),
    id: tID,
  });

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
