// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type EditEntryMessageData = {
  type: 10,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
};

export type RawEditEntryMessageInfo = {
  ...EditEntryMessageData,
  id: string,
};

export type EditEntryMessageInfo = {
  type: 10,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
};
