// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import { messageTypes } from '../message-types-enum';
import type { RelativeUserInfo } from '../user-types';

export type ChangeSettingsMessageData = {
  type: 4,
  threadID: string,
  creatorID: string,
  time: number,
  field: string,
  value: string | number,
};

export type RawChangeSettingsMessageInfo = {
  ...ChangeSettingsMessageData,
  id: string,
};

export const rawChangeSettingsMessageInfoValidator: TInterface = tShape({
  type: tNumber(messageTypes.CHANGE_SETTINGS),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  field: t.String,
  value: t.union([t.String, t.Number]),
  id: t.String,
});

export type ChangeSettingsMessageInfo = {
  type: 4,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  field: string,
  value: string | number,
};
