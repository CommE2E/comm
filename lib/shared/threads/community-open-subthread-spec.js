// @flow

import { keyserverThreadProtocol } from './protocols/keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const communityOpenSubthreadSpec: ThreadSpec = Object.freeze({
  traits: new Set(['communitySubthread']),
  protocol: keyserverThreadProtocol,
  threadLabel: 'Open',
});

export { communityOpenSubthreadSpec };
