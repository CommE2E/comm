// @flow

import type { ThreadSpec } from './thread-spec.js';

const communityOpenSubthreadSpec: ThreadSpec = Object.freeze({
  traits: new Set(['communitySubthread']),
});

export { communityOpenSubthreadSpec };
