// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape, tUserID } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type LegacyUpdateRelationshipMessageData = {
  +type: 16,
  +threadID: string,
  +creatorID: string,
  +targetID: string,
  +time: number,
  +operation: 'request_sent' | 'request_accepted',
};

export type RawLegacyUpdateRelationshipMessageInfo = {
  ...LegacyUpdateRelationshipMessageData,
  id: string,
};

export const rawLegacyUpdateRelationshipMessageInfoValidator: TInterface<RawLegacyUpdateRelationshipMessageInfo> =
  tShape<RawLegacyUpdateRelationshipMessageInfo>({
    type: tNumber(messageTypes.LEGACY_UPDATE_RELATIONSHIP),
    threadID: tID,
    creatorID: tUserID,
    targetID: tUserID,
    time: t.Number,
    operation: t.enums.of(['request_sent', 'request_accepted']),
    id: tID,
  });

export type LegacyUpdateRelationshipMessageInfo = {
  +type: 16,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +target: RelativeUserInfo,
  +time: number,
  +operation: 'request_sent' | 'request_accepted',
};
