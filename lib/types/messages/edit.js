// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type EditMessageData = {
  +type: 20,
  +threadID: string,
  +creatorID: string,
  +time: number,
  +targetMessageID: string,
  +text: string,
};

export type RawEditMessageInfo = {
  ...EditMessageData,
  +id: string,
};

export const rawEditMessageInfoValidator: TInterface<RawEditMessageInfo> =
  tShape<RawEditMessageInfo>({
    type: tNumber(messageTypes.EDIT_MESSAGE),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    targetMessageID: tID,
    text: t.String,
    id: tID,
  });

export type EditMessageInfo = {
  +type: 20,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number, // millisecond timestamp
  +targetMessageID: string,
  +text: string,
};
