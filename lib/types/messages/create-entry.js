// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type CreateEntryMessageData = {
  type: 9,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
};

export type RawCreateEntryMessageInfo = {
  ...CreateEntryMessageData,
  id: string,
};

export const rawCreateEntryMessageInfoValidator: TInterface<RawCreateEntryMessageInfo> =
  tShape<RawCreateEntryMessageInfo>({
    type: tNumber(messageTypes.CREATE_ENTRY),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    entryID: tID,
    date: t.String,
    text: t.String,
    id: tID,
  });

export type CreateEntryMessageInfo = {
  type: 9,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
};
