// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type ChangeSettingsMessageData = {
  type: 4,
  threadID: string,
  creatorID: string,
  time: number,
  field: string,
  value: string | number,
};

export type RawChangeSettingsMessageInfo = {
  ...ChangeSettingsMessageData,
  id: string,
};

export type ChangeSettingsMessageInfo = {
  type: 4,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  field: string,
  value: string | number,
};
