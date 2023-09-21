// @flow

export type ThreadActivityStoreEntry = {
  lastNavigatedTo: number, // millisecond timestamp
  lastPruned: number, // millisecond timestamp
};
export type ThreadActivityStore = {
  +[threadID: string]: ThreadActivityStoreEntry,
};
