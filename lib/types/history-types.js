// @flow
import t, { type TInterface } from 'tcomb';

import { tShape, tID } from '../utils/validation-utils';

export type HistoryMode = 'day' | 'entry';

export type HistoryRevisionInfo = {
  +id: string,
  +entryID: string,
  +author: ?string,
  +text: string,
  +lastUpdate: number,
  +deleted: boolean,
  +threadID: string,
};
export const historyRevisionInfoValidator: TInterface = tShape({
  id: t.String,
  entryID: t.String,
  author: t.maybe(t.String),
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
export const fetchEntryRevisionInfosResultValidator: TInterface = tShape({
  result: t.list(historyRevisionInfoValidator),
});
