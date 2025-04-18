// @flow

import { keyserverThreadProtocol } from './protocols/keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const genesisPrivateSpec: ThreadSpec = Object.freeze({
  traits: new Set(['private']),
  protocol: keyserverThreadProtocol,
});

export { genesisPrivateSpec };
