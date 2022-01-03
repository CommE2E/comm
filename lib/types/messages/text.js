// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import { messageTypes } from '../message-types-enum';
import type { RelativeUserInfo } from '../user-types';

export type TextMessageData = {
  type: 0,
  localID?: string, // for optimistic creations. included by new clients
  threadID: string,
  creatorID: string,
  time: number,
  text: string,
};

export type RawTextMessageInfo = {
  ...TextMessageData,
  id?: string, // null if local copy without ID yet
};
export const rawTextMessageInfoValidator: TInterface = tShape({
  type: tNumber(messageTypes.TEXT),
  localID: t.maybe(t.String),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  text: t.String,
  id: t.maybe(t.String),
});

export type TextMessageInfo = {
  type: 0,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creator: RelativeUserInfo,
  time: number, // millisecond timestamp
  text: string,
};
