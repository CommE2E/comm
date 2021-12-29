// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import type { RelativeUserInfo } from '../user-types';

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

export const rawDeleteEntryMessageInfoValidator: TInterface = tShape({
  type: tNumber(11),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  entryID: t.String,
  date: t.String,
  text: t.String,
  id: t.String,
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
