// @flow

import type { EntryInfo } from './entry-info';

import invariant from 'invariant';

function entryID(entryInfo: EntryInfo): string {
  if (entryInfo.localID) {
    return entryInfo.localID.toString();
  }
  invariant(entryInfo.id, "localID should exist if ID does not");
  return entryInfo.id;
}

export { entryID }
