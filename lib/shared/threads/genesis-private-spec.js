// @flow

import type { ThreadSpec } from './thread-spec.js';

const genesisPrivateSpec: ThreadSpec = Object.freeze({
  traits: new Set(['private']),
});

export { genesisPrivateSpec };
