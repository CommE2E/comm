// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape, tUserID } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type RawPlainMessageInfo = {
  +type: 25,
  +id?: string,
  +threadID: string,
  +creatorID: string,
  +time: number,
  +rawContent: string,
};

export const rawPlainMessageInfoValidator: TInterface<RawPlainMessageInfo> =
  tShape<RawPlainMessageInfo>({
    type: tNumber(messageTypes.PLAIN),
    id: t.maybe(tID),
    threadID: tID,
    creatorID: tUserID,
    time: t.Number,
    rawContent: t.String,
  });

export type PlainMessageInfo = {
  +type: 25,
  +id?: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number,
  +rawContent: string,
};
