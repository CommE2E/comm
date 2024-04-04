// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type UpdateRelationshipMessageData = {
  +type: 22,
  +threadID: string,
  +creatorID: string,
  +targetID: string,
  +time: number,
  +operation: 'request_sent' | 'request_accepted' | 'farcaster_mutual',
};

export type RawUpdateRelationshipMessageInfo = {
  ...UpdateRelationshipMessageData,
  id: string,
};

export const rawUpdateRelationshipMessageInfoValidator: TInterface<RawUpdateRelationshipMessageInfo> =
  tShape<RawUpdateRelationshipMessageInfo>({
    type: tNumber(messageTypes.UPDATE_RELATIONSHIP),
    threadID: tID,
    creatorID: t.String,
    targetID: t.String,
    time: t.Number,
    operation: t.enums.of([
      'request_sent',
      'request_accepted',
      'farcaster_mutual',
    ]),
    id: tID,
  });

export type UpdateRelationshipMessageInfo = {
  +type: 22,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +target: RelativeUserInfo,
  +time: number,
  +operation: 'request_sent' | 'request_accepted' | 'farcaster_mutual',
};
