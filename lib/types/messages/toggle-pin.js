// @flow

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
