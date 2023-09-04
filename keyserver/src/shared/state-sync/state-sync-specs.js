// @flow

import { currentUserStateSyncSpec } from './current-user-state-sync-spec.js';
import { entriesStateSyncSpec } from './entries-state-sync-spec.js';
import type { ServerStateSyncSpec } from './state-sync-spec.js';
import { threadsStateSyncSpec } from './threads-state-sync-spec.js';
import { usersStateSyncSpec } from './users-state-sync-spec.js';

export const serverStateSyncSpecs: {
  +[string]: ServerStateSyncSpec<*, *, *>,
} = Object.freeze({
  threads: threadsStateSyncSpec,
  entries: entriesStateSyncSpec,
  currentUser: currentUserStateSyncSpec,
  users: usersStateSyncSpec,
});
