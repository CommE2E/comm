// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type DeleteEntryMessageData = {
  type: 11,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
};

export type RawDeleteEntryMessageInfo = {
  ...DeleteEntryMessageData,
  id: string,
};

export type DeleteEntryMessageInfo = {
  type: 11,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
};
