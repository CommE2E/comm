// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import { messageTypes } from '../message-types-enum';
import type { RelativeUserInfo } from '../user-types';
export type UpdateRelationshipMessageData = {
  +type: 16,
  +threadID: string,
  +creatorID: string,
  +targetID: string,
  +time: number,
  +operation: 'request_sent' | 'request_accepted',
};

export type RawUpdateRelationshipMessageInfo = {
  ...UpdateRelationshipMessageData,
  id: string,
};

export const rawUpdateRelationshipMessageInfoValidator: TInterface = tShape({
  type: tNumber(messageTypes.UPDATE_RELATIONSHIP),
  threadID: tID,
  creatorID: t.String,
  targetID: t.String,
  time: t.Number,
  operation: t.enums.of(['request_sent', 'request_accepted']),
  id: t.String,
});

export type UpdateRelationshipMessageInfo = {
  +type: 16,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +target: RelativeUserInfo,
  +time: number,
  +operation: 'request_sent' | 'request_accepted',
};
