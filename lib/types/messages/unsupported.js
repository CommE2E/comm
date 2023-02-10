// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type RawUnsupportedMessageInfo = {
  type: 13,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  robotext: string,
  dontPrefixCreator?: boolean,
  unsupportedMessageInfo: Object,
};

export type UnsupportedMessageInfo = {
  type: 13,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  robotext: string,
  dontPrefixCreator?: boolean,
  unsupportedMessageInfo: Object,
};
