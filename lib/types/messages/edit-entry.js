// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import { messageTypes } from '../message-types-enum';
import type { RelativeUserInfo } from '../user-types';

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

export const rawEditEntryMessageInfoValidator: TInterface = tShape({
  type: tNumber(messageTypes.EDIT_ENTRY),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  entryID: t.String,
  date: t.String,
  text: t.String,
  id: t.String,
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
