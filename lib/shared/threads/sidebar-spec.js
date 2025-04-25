// @flow

import { keyserverThreadProtocol } from './protocols/keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const sidebarSpec: ThreadSpec = Object.freeze({
  traits: new Set(['sidebar']),
  protocol: keyserverThreadProtocol,
  threadLabel: 'Thread',
});

export { sidebarSpec };
