// @flow

import t, { type TInterface } from 'tcomb';

import { tShape, tID, tNumber } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

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

export const rawAddMembersMessageInfoValidator: TInterface<RawAddMembersMessageInfo> =
  tShape<RawAddMembersMessageInfo>({
    type: tNumber(messageTypes.ADD_MEMBERS),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    addedUserIDs: t.list(t.String),
    id: tID,
  });

export type AddMembersMessageInfo = {
  type: 2,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  addedMembers: RelativeUserInfo[],
};
