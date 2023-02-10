// @flow

import type { RelativeUserInfo } from '../user-types.js';

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

export type UpdateRelationshipMessageInfo = {
  +type: 16,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +target: RelativeUserInfo,
  +time: number,
  +operation: 'request_sent' | 'request_accepted',
};
