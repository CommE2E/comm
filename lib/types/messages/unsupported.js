// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

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

export const rawUnsupportedMessageInfoValidator: TInterface<RawUnsupportedMessageInfo> =
  tShape<RawUnsupportedMessageInfo>({
    type: tNumber(messageTypes.UNSUPPORTED),
    id: tID,
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
