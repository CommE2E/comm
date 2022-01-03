// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import { messageTypes } from '../message-types-enum';
import type { RelativeUserInfo } from '../user-types';

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

export const rawChangeRoleMessageInfoValidator: TInterface = tShape({
  type: tNumber(messageTypes.CHANGE_ROLE),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  userIDs: t.list(t.String),
  newRole: t.String,
  id: t.String,
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
