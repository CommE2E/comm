// @flow

import type { StateSyncSpec } from './state-sync-spec.js';

export const currentUserStateSyncSpec: StateSyncSpec<> = Object.freeze({
  hashKey: 'currentUserInfo',
});
