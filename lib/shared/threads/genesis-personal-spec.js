// @flow

import { keyserverThreadProtocol } from './keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const genesisPersonalSpec: ThreadSpec = Object.freeze({
  traits: new Set(['personal']),
  protocol: keyserverThreadProtocol,
});

export { genesisPersonalSpec };
