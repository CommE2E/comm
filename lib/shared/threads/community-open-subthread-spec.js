// @flow

import { keyserverThreadProtocol } from './keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const communityOpenSubthreadSpec: ThreadSpec = Object.freeze({
  traits: new Set(['communitySubthread']),
  protocol: keyserverThreadProtocol,
});

export { communityOpenSubthreadSpec };
