// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import type { ThreadInfo } from '../thread-types';
import type { RelativeUserInfo } from '../user-types';

export type CreateSidebarMessageData = {
  +type: 18,
  +threadID: string,
  +creatorID: string,
  +time: number,
  +sourceMessageAuthorID: string,
  +initialThreadState: {
    +name: ?string,
    +parentThreadID: string,
    +color: string,
    +memberIDs: string[],
  },
};

export type RawCreateSidebarMessageInfo = {
  ...CreateSidebarMessageData,
  id: string,
};

export const rawCreateSidebarMessageInfoValidator: TInterface = tShape({
  type: tNumber(18),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  sourceMessageAuthorID: t.String,
  initialThreadState: tShape({
    name: t.maybe(t.String),
    parentThreadID: tID,
    color: t.String,
    memberIDs: t.list(t.String),
  }),
  id: t.String,
});

export type CreateSidebarMessageInfo = {
  +type: 18,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number,
  +sourceMessageAuthor: RelativeUserInfo,
  +initialThreadState: {
    +name: ?string,
    +parentThreadInfo: ThreadInfo,
    +color: string,
    +otherMembers: RelativeUserInfo[],
  },
};
