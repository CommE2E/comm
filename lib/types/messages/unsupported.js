// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import type { RelativeUserInfo } from '../user-types';

export type RawUnsupportedMessageInfo = {
  type: 13,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  robotext: string,
  dontPrefixCreator?: boolean,
  unsupportedMessageInfo: Object,
};

export const rawUnsupportedMessageInfoValidator: TInterface = tShape({
  type: tNumber(13),
  id: t.String,
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  robotext: t.String,
  dontPrefixCreator: t.maybe(t.Boolean),
  unsupportedMessageInfo: t.Object,
});

export type UnsupportedMessageInfo = {
  type: 13,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  robotext: string,
  dontPrefixCreator?: boolean,
  unsupportedMessageInfo: Object,
};
