// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape, tUserID } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type DeleteMessageData = {
  +type: 23,
  +threadID: string,
  +creatorID: string,
  +time: number,
  +targetMessageID: string,
};

export type RawDeleteMessageInfo = $ReadOnly<{
  ...DeleteMessageData,
  +id: string,
}>;

export const rawDeleteMessageInfoValidator: TInterface<RawDeleteMessageInfo> =
  tShape<RawDeleteMessageInfo>({
    type: tNumber(messageTypes.DELETE_MESSAGE),
    threadID: tID,
    creatorID: tUserID,
    time: t.Number,
    targetMessageID: tID,
    id: tID,
  });

export type DeleteMessageInfo = {
  +type: 23,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number, // millisecond timestamp
  +targetMessageID: string,
};
