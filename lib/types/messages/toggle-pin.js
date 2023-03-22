// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type TogglePinMessageData = {
  +type: 20,
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
  +type: 20,
  +id: string,
  +threadID: string,
  +targetMessageID: string,
  +action: 'pin' | 'unpin',
  +pinnedContent: string,
  +creator: RelativeUserInfo,
  +time: number,
};
