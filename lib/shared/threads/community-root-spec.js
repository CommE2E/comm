// @flow

import { keyserverThreadProtocol } from './keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const communityRootSpec: ThreadSpec = Object.freeze({
  traits: new Set(['community']),
  protocol: keyserverThreadProtocol,
});

export { communityRootSpec };
