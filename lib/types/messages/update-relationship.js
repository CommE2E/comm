// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import {
  tID,
  tNumber,
  tShape,
  tString,
  tUserID,
} from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type TraditionalRelationshipOperation =
  | 'request_sent'
  | 'request_accepted';

export type FarcasterRelationshipOperation = 'farcaster_mutual';

export type RelationshipOperation =
  | TraditionalRelationshipOperation
  | FarcasterRelationshipOperation;

export type UpdateTraditionalRelationshipMessageData = {
  +type: 22,
  +threadID: string,
  +creatorID: string,
  +targetID: string,
  +time: number,
  +operation: TraditionalRelationshipOperation,
};

export type UpdateFarcasterRelationshipMessageData = {
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
  | UpdateTraditionalRelationshipMessageData
  | UpdateFarcasterRelationshipMessageData;

export type RawUpdateTraditionalRelationshipMessageInfo = $ReadOnly<{
  ...UpdateTraditionalRelationshipMessageData,
  +id: string,
}>;

export type RawUpdateFarcasterRelationshipMessageInfo = $ReadOnly<{
  ...UpdateFarcasterRelationshipMessageData,
  +id: string,
}>;

export type RawUpdateRelationshipMessageInfo =
  | RawUpdateTraditionalRelationshipMessageInfo
  | RawUpdateFarcasterRelationshipMessageInfo;

export const rawUpdateTraditionalRelationshipMessageInfoValidator: TInterface<RawUpdateRelationshipMessageInfo> =
  tShape<RawUpdateRelationshipMessageInfo>({
    id: tID,
    type: tNumber(messageTypes.UPDATE_RELATIONSHIP),
    threadID: tID,
    creatorID: tUserID,
    targetID: tUserID,
    time: t.Number,
    operation: t.enums.of(['request_sent', 'request_accepted']),
  });

export const rawUpdateFarcasterRelationshipMessageInfoValidator: TInterface<RawUpdateFarcasterRelationshipMessageInfo> =
  tShape<RawUpdateFarcasterRelationshipMessageInfo>({
    id: tID,
    type: tNumber(messageTypes.UPDATE_RELATIONSHIP),
    threadID: tID,
    creatorID: tUserID,
    creatorFID: t.String,
    targetID: tUserID,
    targetFID: t.String,
    time: t.Number,
    operation: tString('farcaster_mutual'),
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
