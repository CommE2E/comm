// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type CreateEntryMessageData = {
  type: 9,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
};

export type RawCreateEntryMessageInfo = {
  ...CreateEntryMessageData,
  id: string,
};

export type CreateEntryMessageInfo = {
  type: 9,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
};
