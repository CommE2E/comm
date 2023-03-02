// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type EditMessageData = {
  +type: 20,
  +localID?: string, // for optimistic creations. included by new clients
  +threadID: string,
  +creatorID: string,
  +time: number,
  +targetMessageID: string,
  +text: string,
};

export type RawEditMessageInfo = {
  ...EditMessageData,
  id?: string, // null if local copy without ID yet
};

export type EditMessageInfo = {
  +type: 20,
  +id?: string, // null if local copy without ID yet
  +localID?: string, // for optimistic creations
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number, // millisecond timestamp
  +targetMessageID: string,
  +text: string,
};
