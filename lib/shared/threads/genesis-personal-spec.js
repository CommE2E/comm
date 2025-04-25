// @flow

import { keyserverThreadProtocol } from './protocols/keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const genesisPersonalSpec: ThreadSpec = Object.freeze({
  traits: new Set(['personal']),
  protocol: keyserverThreadProtocol,
  threadLabel: 'Personal',
});

export { genesisPersonalSpec };
