// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type TogglePinMessageData = {
  +type: 21,
  +threadID: string,
  +targetMessageID: string,
  +action: 'pin' | 'unpin',
  +pinnedContent: string,
  +creatorID: string,
  +time: number,
};

export type RawTogglePinMessageInfo = {
  ...TogglePinMessageData,
  +id: string,
};

export const rawTogglePinMessageInfoValidator: TInterface<RawTogglePinMessageInfo> =
  tShape<RawTogglePinMessageInfo>({
    type: tNumber(messageTypes.TOGGLE_PIN),
    threadID: tID,
    targetMessageID: tID,
    action: t.enums.of(['pin', 'unpin']),
    pinnedContent: t.String,
    creatorID: t.String,
    time: t.Number,
    id: tID,
  });

export type TogglePinMessageInfo = {
  +type: 21,
  +id: string,
  +threadID: string,
  +targetMessageID: string,
  +action: 'pin' | 'unpin',
  +pinnedContent: string,
  +creator: RelativeUserInfo,
  +time: number,
};
