// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type EditMessageData = {
  +type: 20,
  +threadID: string,
  +creatorID: string,
  +time: number,
  +targetMessageID: string,
  +text: string,
};

export type RawEditMessageInfo = {
  ...EditMessageData,
  +id: string,
};

export type EditMessageInfo = {
  +type: 20,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number, // millisecond timestamp
  +targetMessageID: string,
  +text: string,
};
