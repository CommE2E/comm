// @flow

import type { ThreadSpec } from './thread-spec.js';

const genesisSpec: ThreadSpec = Object.freeze({
  traits: new Set(['community', 'announcement']),
});

export { genesisSpec };
