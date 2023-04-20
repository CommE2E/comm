// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

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

export const rawChangeSettingsMessageInfoValidator: TInterface<RawChangeSettingsMessageInfo> =
  tShape<RawChangeSettingsMessageInfo>({
    type: tNumber(messageTypes.CHANGE_SETTINGS),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    field: t.String,
    value: t.union([t.String, t.Number]),
    id: tID,
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
