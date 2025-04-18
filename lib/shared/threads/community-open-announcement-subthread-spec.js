// @flow

import type { ThreadSpec } from './thread-spec.js';

const communityOpenAnnouncementSubthreadSpec: ThreadSpec = Object.freeze({
  traits: new Set(['communitySubthread', 'announcement']),
});

export { communityOpenAnnouncementSubthreadSpec };
