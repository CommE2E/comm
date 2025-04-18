// @flow

import type { ThreadSpec } from './thread-spec.js';

const genesisPersonalSpec: ThreadSpec = Object.freeze({
  traits: new Set(['personal']),
});

export { genesisPersonalSpec };
