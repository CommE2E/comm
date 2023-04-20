// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type DeleteEntryMessageData = {
  type: 11,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
};

export type RawDeleteEntryMessageInfo = {
  ...DeleteEntryMessageData,
  id: string,
};

export const rawDeleteEntryMessageInfoValidator: TInterface<RawDeleteEntryMessageInfo> =
  tShape<RawDeleteEntryMessageInfo>({
    type: tNumber(messageTypes.DELETE_ENTRY),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    entryID: tID,
    date: t.String,
    text: t.String,
    id: tID,
  });

export type DeleteEntryMessageInfo = {
  type: 11,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
};
