// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type ChangeRoleMessageData = {
  type: 6,
  threadID: string,
  creatorID: string,
  time: number,
  userIDs: string[],
  newRole: string,
};

export type RawChangeRoleMessageInfo = {
  ...ChangeRoleMessageData,
  id: string,
};

export const rawChangeRoleMessageInfoValidator: TInterface<RawChangeRoleMessageInfo> =
  tShape<RawChangeRoleMessageInfo>({
    type: tNumber(messageTypes.CHANGE_ROLE),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    userIDs: t.list(t.String),
    newRole: t.String,
    id: tID,
  });

export type ChangeRoleMessageInfo = {
  type: 6,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  members: RelativeUserInfo[],
  newRole: string,
};
