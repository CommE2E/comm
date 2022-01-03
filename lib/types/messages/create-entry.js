// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import { messageTypes } from '../message-types-enum';
import type { RelativeUserInfo } from '../user-types';

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

export const rawCreateEntryMessageInfoValidator: TInterface = tShape({
  type: tNumber(messageTypes.CREATE_ENTRY),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  entryID: t.String,
  date: t.String,
  text: t.String,
  id: t.String,
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
