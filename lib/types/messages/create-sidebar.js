// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape, tUserID } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { ThreadInfo } from '../minimally-encoded-thread-permissions-types.js';
import type { RelativeUserInfo } from '../user-types.js';

export type CreateSidebarMessageData = {
  +type: 18,
  +threadID: string,
  +creatorID: string,
  +time: number,
  +sourceMessageAuthorID: string,
  +initialThreadState: {
    +name?: ?string,
    +parentThreadID: string,
    +color: string,
    +memberIDs: string[],
  },
};

export type RawCreateSidebarMessageInfo = {
  ...CreateSidebarMessageData,
  id: string,
};

export const rawCreateSidebarMessageInfoValidator: TInterface<RawCreateSidebarMessageInfo> =
  tShape<RawCreateSidebarMessageInfo>({
    type: tNumber(messageTypes.CREATE_SIDEBAR),
    threadID: tID,
    creatorID: tUserID,
    time: t.Number,
    sourceMessageAuthorID: tUserID,
    initialThreadState: tShape({
      name: t.maybe(t.String),
      parentThreadID: tID,
      color: t.String,
      memberIDs: t.list(tUserID),
    }),
    id: tID,
  });

export type CreateSidebarMessageInfo = {
  +type: 18,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number,
  +sourceMessageAuthor: RelativeUserInfo,
  +initialThreadState: {
    +name?: ?string,
    +parentThreadInfo: ThreadInfo,
    +color: string,
    +otherMembers: RelativeUserInfo[],
  },
};
