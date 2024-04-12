// @flow

import t, { type TInterface, TUnion } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type TraditionalRelationshipOperation =
  | 'request_sent'
  | 'request_accepted';

export type FarcasterRelationshipOperation = 'farcaster_mutual';

export type UpdateTraditionalMessageData = {
  +type: 22,
  +threadID: string,
  +creatorID: string,
  +targetID: string,
  +time: number,
  +operation: TraditionalRelationshipOperation,
};

export type UpdateFarcasterMessageData = {
  +type: 22,
  +threadID: string,
  +creatorID: string,
  +creatorFID: string,
  +targetID: string,
  +targetFID: string,
  +time: number,
  +operation: FarcasterRelationshipOperation,
};

export type UpdateRelationshipMessageData =
  | UpdateTraditionalMessageData
  | UpdateFarcasterMessageData;

export type RawUpdateRelationshipMessageInfo = {
  ...UpdateRelationshipMessageData,
  id: string,
};

export const rawUpdateTraditionalRelationshipMessageInfoValidator: TInterface<RawUpdateRelationshipMessageInfo> =
  tShape<RawUpdateRelationshipMessageInfo>({
    id: tID,
    type: tNumber(messageTypes.UPDATE_RELATIONSHIP),
    threadID: tID,
    creatorID: t.String,
    targetID: t.String,
    time: t.Number,
    operation: t.enums.of(['request_sent', 'request_accepted']),
  });

export const rawUpdateFarcasterRelationshipMessageInfoValidator: TInterface<RawUpdateRelationshipMessageInfo> =
  tShape<RawUpdateRelationshipMessageInfo>({
    id: tID,
    type: tNumber(messageTypes.UPDATE_RELATIONSHIP),
    threadID: tID,
    creatorID: t.String,
    creatorFID: t.String,
    targetID: t.String,
    targetFID: t.String,
    time: t.Number,
    operation: t.enums.of(['farcaster_mutual']),
  });

export const rawUpdateRelationshipMessageInfoValidator: TUnion<RawUpdateRelationshipMessageInfo> =
  t.union([
    rawUpdateTraditionalRelationshipMessageInfoValidator,
    rawUpdateFarcasterRelationshipMessageInfoValidator,
  ]);

export type UpdateTraditionalRelationshipMessageInfo = {
  +type: 22,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +target: RelativeUserInfo,
  +time: number,
  +operation: TraditionalRelationshipOperation,
};

export type UpdateFarcasterRelationshipMessageInfo = {
  +type: 22,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +creatorFID: string,
  +target: RelativeUserInfo,
  +targetFID: string,
  +time: number,
  +operation: FarcasterRelationshipOperation,
};

export type UpdateRelationshipMessageInfo =
  | UpdateTraditionalRelationshipMessageInfo
  | UpdateFarcasterRelationshipMessageInfo;
