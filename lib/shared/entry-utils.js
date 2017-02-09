// @flow

import type { EntryInfo } from '../types/entry-types';

import invariant from 'invariant';

function entryKey(entryInfo: EntryInfo): string {
  if (entryInfo.localID) {
    return entryInfo.localID;
  }
  invariant(entryInfo.id, "localID should exist if ID does not");
  return entryInfo.id;
}

export { entryKey }
