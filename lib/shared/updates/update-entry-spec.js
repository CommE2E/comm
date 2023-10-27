// @flow

import type { UpdateSpec } from './update-spec.js';
import type { RawEntryInfo } from '../../types/entry-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  EntryUpdateInfo,
  EntryRawUpdateInfo,
  EntryUpdateData,
} from '../../types/update-types.js';

export const updateEntrySpec: UpdateSpec<
  EntryUpdateInfo,
  EntryRawUpdateInfo,
  EntryUpdateData,
> = Object.freeze({
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
  rawUpdateInfoFromRow(row: Object) {
    const { entryID } = JSON.parse(row.content);
    return {
      type: updateTypes.UPDATE_ENTRY,
      id: row.id.toString(),
      time: row.time,
      entryID,
    };
  },
  updateContentForServerDB(data: EntryUpdateData) {
    const { entryID } = data;
    return JSON.stringify({ entryID });
  },
});
