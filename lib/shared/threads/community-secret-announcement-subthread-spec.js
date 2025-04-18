// @flow

import type { ThreadSpec } from './thread-spec.js';

const communitySecretAnnouncementSubthreadSpec: ThreadSpec = Object.freeze({
  traits: new Set(['communitySubthread', 'announcement']),
});

export { communitySecretAnnouncementSubthreadSpec };
