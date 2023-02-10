// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type RestoreEntryMessageData = {
  type: 12,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
};

export type RawRestoreEntryMessageInfo = {
  ...RestoreEntryMessageData,
  id: string,
};

export type RestoreEntryMessageInfo = {
  type: 12,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
};
