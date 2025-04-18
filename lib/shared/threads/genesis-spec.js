// @flow

import { keyserverThreadProtocol } from './protocols/keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const genesisSpec: ThreadSpec = Object.freeze({
  traits: new Set(['community', 'announcement']),
  protocol: keyserverThreadProtocol,
});

export { genesisSpec };
