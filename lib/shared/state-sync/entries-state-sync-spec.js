// @flow

import type { StateSyncSpec } from './state-sync-spec.js';

export const entriesStateSyncSpec: StateSyncSpec<> = Object.freeze({
  hashKey: 'entryInfos',
  innerHashSpec: {
    hashKey: 'entryInfo',
    deleteKey: 'deleteEntryIDs',
    rawInfosKey: 'rawEntryInfos',
  },
});
