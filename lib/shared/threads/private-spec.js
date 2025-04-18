// @flow

import { dmThreadProtocol } from './protocols/dm-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const privateSpec: ThreadSpec = Object.freeze({
  traits: new Set(['private']),
  protocol: dmThreadProtocol,
});

export { privateSpec };
