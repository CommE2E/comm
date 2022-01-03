// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import { messageTypes } from '../message-types-enum';
import type { RelativeUserInfo } from '../user-types';

export type RestoreEntryMessageData = {
  type: 12,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
};

export type RawRestoreEntryMessageInfo = {
  ...RestoreEntryMessageData,
  id: string,
};

export const rawRestoreEntryMessageInfoValidator: TInterface = tShape({
  type: tNumber(messageTypes.RESTORE_ENTRY),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  entryID: t.String,
  date: t.String,
  text: t.String,
  id: t.String,
});

export type RestoreEntryMessageInfo = {
  type: 12,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
};
