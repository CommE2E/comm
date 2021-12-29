// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import type { RelativeUserInfo } from '../user-types';

export type AddMembersMessageData = {
  type: 2,
  threadID: string,
  creatorID: string,
  time: number,
  addedUserIDs: string[],
};

export type RawAddMembersMessageInfo = {
  ...AddMembersMessageData,
  id: string,
};

export const rawAddMembersMessageInfoValidator: TInterface = tShape({
  type: tNumber(2),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  addedUserIDs: t.list(t.String),
  id: t.String,
});

export type AddMembersMessageInfo = {
  type: 2,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  addedMembers: RelativeUserInfo[],
};
