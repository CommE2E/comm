// @flow

import type { EntryInfo } from './entry-info';

import invariant from 'invariant';

function entryID(entryInfo: EntryInfo): string {
  if (entryInfo.id) {
    return entryInfo.id;
  }
  invariant(entryInfo.localID, "localID should exist if ID does not");
  return entryInfo.localID.toString();
}

export { entryID }
