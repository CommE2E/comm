// @flow

import type { ThreadSpec } from './thread-spec.js';

const communityAnnouncementRootSpec: ThreadSpec = Object.freeze({
  traits: new Set(['community', 'announcement']),
});

export { communityAnnouncementRootSpec };
