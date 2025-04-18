// @flow

import type { ThreadSpec } from './thread-spec.js';

const communityRootSpec: ThreadSpec = Object.freeze({
  traits: new Set(['community']),
});

export { communityRootSpec };
