// @flow

import type { UpdateSpec } from './update-spec.js';
import type { RawEntryInfo } from '../../types/entry-types.js';
import type { EntryUpdateInfo } from '../../types/update-types.js';

export const updateEntrySpec: UpdateSpec<EntryUpdateInfo> = Object.freeze({
  mergeEntryInfos(
    entryIDs: Set<string>,
    mergedEntryInfos: Array<RawEntryInfo>,
    update: EntryUpdateInfo,
  ) {
    const { entryInfo } = update;
    const entryID = entryInfo.id;
    if (!entryID || entryIDs.has(entryID)) {
      return;
    }
    mergedEntryInfos.push(entryInfo);
    entryIDs.add(entryID);
  },
});
