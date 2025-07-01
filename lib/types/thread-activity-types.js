// @flow

export const updateThreadLastNavigatedActionType =
  'UPDATE_THREAD_LAST_NAVIGATED' as const;

export type ThreadActivityStoreEntry =
  | {
      +lastNavigatedTo: number, // millisecond timestamp
      +lastPruned?: number, // millisecond timestamp
    }
  | {
      +lastNavigatedTo?: number,
      +lastPruned: number,
    };

export type ThreadActivityStore = {
  +[threadID: string]: ThreadActivityStoreEntry,
};
