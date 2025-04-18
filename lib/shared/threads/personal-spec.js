// @flow

import { dmThreadProtocol } from './dm-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const personalSpec: ThreadSpec = Object.freeze({
  traits: new Set(['personal']),
  protocol: dmThreadProtocol,
});

export { personalSpec };
