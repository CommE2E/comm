// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { values } from '../../utils/objects';
import { tID, tShape, tNumber, tNumEnum } from '../../utils/validation-utils';
import { type ThreadInfo, type ThreadType, threadTypes } from '../thread-types';
import type { RelativeUserInfo } from '../user-types';

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

export const rawCreateThreadMessageInfoValidator: TInterface = tShape({
  type: tNumber(1),
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
  id: t.String,
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
