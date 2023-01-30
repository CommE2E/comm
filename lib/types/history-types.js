// @flow

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

export type FetchEntryRevisionInfosRequest = {
  +id: string,
};
export type FetchEntryRevisionInfosResult = {
  +result: $ReadOnlyArray<HistoryRevisionInfo>,
};
