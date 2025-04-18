// @flow

import { keyserverThreadProtocol } from './protocols/keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const communitySecretSubthreadSpec: ThreadSpec = Object.freeze({
  traits: new Set(['communitySubthread']),
  protocol: keyserverThreadProtocol,
});

export { communitySecretSubthreadSpec };
