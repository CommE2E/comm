// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type EditEntryMessageData = {
  type: 10,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
};

export type RawEditEntryMessageInfo = {
  ...EditEntryMessageData,
  id: string,
};

export const rawEditEntryMessageInfoValidator: TInterface<RawEditEntryMessageInfo> =
  tShape<RawEditEntryMessageInfo>({
    type: tNumber(messageTypes.EDIT_ENTRY),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    entryID: tID,
    date: t.String,
    text: t.String,
    id: tID,
  });

export type EditEntryMessageInfo = {
  type: 10,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
};
