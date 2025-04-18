// @flow

import type { ThreadSpec } from './thread-spec.js';

const privateSpec: ThreadSpec = Object.freeze({
  traits: new Set(['private']),
});

export { privateSpec };
