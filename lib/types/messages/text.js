// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

type TextSharedBase = {
  +type: 0,
  +localID?: string, // for optimistic creations. included by new clients
  +threadID: string,
  +creatorID: string,
  +time: number,
  +text: string,
};

export type TextMessageData = {
  ...TextSharedBase,
  +sidebarCreation?: boolean,
};

export type RawTextMessageInfo = {
  ...TextSharedBase,
  +id?: string, // null if local copy without ID yet
};

export const rawTextMessageInfoValidator: TInterface<RawTextMessageInfo> =
  tShape<RawTextMessageInfo>({
    type: tNumber(messageTypes.TEXT),
    localID: t.maybe(t.String),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    text: t.String,
    id: t.maybe(tID),
  });

export type TextMessageInfo = {
  +type: 0,
  +id?: string, // null if local copy without ID yet
  +localID?: string, // for optimistic creations
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number, // millisecond timestamp
  +text: string,
};
