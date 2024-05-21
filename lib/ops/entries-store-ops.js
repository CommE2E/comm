// @flow

import type { ClientDBAuxUserInfo } from './aux-user-store-ops.js';
import type { RawEntryInfo } from '../types/entry-types.js';

export type ReplaceEntryOperation = {
  +type: 'replace_entry',
  +payload: {
    +id: string,
    +entry: RawEntryInfo,
  },
};

export type RemoveEntriesOperation = {
  +type: 'remove_entries',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllEntriesOperation = {
  +type: 'remove_all_entries',
};

export type EntryStoreOperation =
  | ReplaceEntryOperation
  | RemoveEntriesOperation
  | RemoveAllEntriesOperation;

export type ClientDBEntryInfo = {
  +id: string,
  +entryInfo: string,
};

export type ClientDBReplaceEntryOperation = {
  +type: 'replace_entry',
  +payload: ClientDBAuxUserInfo,
};

export type ClientDBEntryStoreOperation =
  | ClientDBEntryStoreOperation
  | RemoveEntriesOperation
  | RemoveAllEntriesOperation;
