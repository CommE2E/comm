// @flow

import type { ThreadSpec } from './thread-spec.js';

const personalSpec: ThreadSpec = Object.freeze({
  traits: new Set(['personal']),
});

export { personalSpec };
