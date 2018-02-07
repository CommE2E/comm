// @flow

import type { RawEntryInfo, EntryInfo } from '../types/entry-types';
import type { UserInfo } from '../types/user-types';

import invariant from 'invariant';

function entryKey(entryInfo: EntryInfo): string {
  if (entryInfo.localID) {
    return entryInfo.localID;
  }
  invariant(entryInfo.id, "localID should exist if ID does not");
  return entryInfo.id;
}

function entryID(entryInfo: EntryInfo): string {
  if (entryInfo.id) {
    return entryInfo.id;
  }
  invariant(entryInfo.localID, "localID should exist if ID does not");
  return entryInfo.localID;
}

function createEntryInfo(
  rawEntryInfo: RawEntryInfo,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): EntryInfo {
  const creatorInfo = userInfos[rawEntryInfo.creatorID];
  return {
    id: rawEntryInfo.id,
    localID: rawEntryInfo.localID,
    threadID: rawEntryInfo.threadID,
    text: rawEntryInfo.text,
    year: rawEntryInfo.year,
    month: rawEntryInfo.month,
    day: rawEntryInfo.day,
    creationTime: rawEntryInfo.creationTime,
    creator: creatorInfo && creatorInfo.username,
    deleted: rawEntryInfo.deleted,
  };
}

export {
  entryKey,
  entryID,
  createEntryInfo,
}
