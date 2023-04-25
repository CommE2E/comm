// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape } from '../utils/validation-utils.js';

export type HistoryMode = 'day' | 'entry';

export type HistoryRevisionInfo = {
  +id: string,
  +entryID: string,
  +authorID: string,
  +text: string,
  +lastUpdate: number,
  +deleted: boolean,
  +threadID: string,
};
export const historyRevisionInfoValidator: TInterface<HistoryRevisionInfo> =
  tShape<HistoryRevisionInfo>({
    id: tID,
    entryID: tID,
    authorID: t.String,
    text: t.String,
    lastUpdate: t.Number,
    deleted: t.Boolean,
    threadID: tID,
  });

export type FetchEntryRevisionInfosRequest = {
  +id: string,
};
export type FetchEntryRevisionInfosResult = {
  +result: $ReadOnlyArray<HistoryRevisionInfo>,
};
