// @flow

import { keyserverThreadProtocol } from './keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const sidebarSpec: ThreadSpec = Object.freeze({
  traits: new Set(['sidebar']),
  protocol: keyserverThreadProtocol,
});

export { sidebarSpec };
