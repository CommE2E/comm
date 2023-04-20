// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

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

export const rawRestoreEntryMessageInfoValidator: TInterface<RawRestoreEntryMessageInfo> =
  tShape<RawRestoreEntryMessageInfo>({
    type: tNumber(messageTypes.RESTORE_ENTRY),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    entryID: tID,
    date: t.String,
    text: t.String,
    id: tID,
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
