// @flow

import invariant from 'invariant';
import t from 'tcomb';

import type { UpdateInfoFromRawInfoParams, UpdateSpec } from './update-spec.js';
import type { RawEntryInfo } from '../../types/entry-types.js';
import { rawEntryInfoValidator } from '../../types/entry-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  EntryUpdateInfo,
  EntryRawUpdateInfo,
  EntryUpdateData,
} from '../../types/update-types.js';
import { tNumber, tShape } from '../../utils/validation-utils.js';

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
  entitiesToFetch(update: EntryRawUpdateInfo) {
    return {
      entryID: update.entryID,
    };
  },
  updateInfoFromRawInfo(
    info: EntryRawUpdateInfo,
    params: UpdateInfoFromRawInfoParams,
  ) {
    const { entryInfosResult } = params.data;
    invariant(entryInfosResult, 'should be set');
    const entryInfo = entryInfosResult[info.entryID];
    if (!entryInfo) {
      console.warn(
        "failed to hydrate updateTypes.UPDATE_ENTRY because we couldn't " +
          `fetch RawEntryInfo for ${info.entryID}`,
      );
      return null;
    }
    return {
      type: updateTypes.UPDATE_ENTRY,
      id: info.id,
      time: info.time,
      entryInfo,
    };
  },
  deleteCondition: 'all_types',
  typesOfReplacedUpdatesForMatchingKey: 'all_types',
  infoValidator: tShape<EntryUpdateInfo>({
    type: tNumber(updateTypes.UPDATE_ENTRY),
    id: t.String,
    time: t.Number,
    entryInfo: rawEntryInfoValidator,
  }),
});
