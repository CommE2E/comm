// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

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

export const rawRemoveMembersMessageInfoValidator: TInterface<RawRemoveMembersMessageInfo> =
  tShape<RawRemoveMembersMessageInfo>({
    type: tNumber(messageTypes.REMOVE_MEMBERS),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    removedUserIDs: t.list(t.String),
    id: tID,
  });

export type RemoveMembersMessageInfo = {
  type: 5,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  removedMembers: RelativeUserInfo[],
};
