// @flow

import { currentUserStateSyncSpec } from './current-user-state-sync-spec.js';
import { entriesStateSyncSpec } from './entries-state-sync-spec.js';
import type { StateSyncSpec } from './state-sync-spec.js';
import { threadsStateSyncSpec } from './threads-state-sync-spec.js';
import { usersStateSyncSpec } from './users-state-sync-spec.js';

export const stateSyncSpecs = Object.freeze({
  threads: threadsStateSyncSpec,
  entries: entriesStateSyncSpec,
  currentUser: currentUserStateSyncSpec,
  users: usersStateSyncSpec,
});

(stateSyncSpecs: {
  +[string]: StateSyncSpec<any>,
});
