// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import { messageTypes } from '../message-types-enum';
import type { RelativeUserInfo } from '../user-types';

export type RemoveMembersMessageData = {
  type: 5,
  threadID: string,
  creatorID: string,
  time: number,
  removedUserIDs: string[],
};

export type RawRemoveMembersMessageInfo = {
  ...RemoveMembersMessageData,
  id: string,
};

export const rawRemoveMembersMessageInfoValidator: TInterface = tShape({
  type: tNumber(messageTypes.REMOVE_MEMBERS),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  removedUserIDs: t.list(t.String),
  id: t.String,
});

export type RemoveMembersMessageInfo = {
  type: 5,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  removedMembers: RelativeUserInfo[],
};
