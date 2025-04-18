// @flow

import { dmThreadProtocol } from './protocols/dm-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const localSpec: ThreadSpec = Object.freeze({
  traits: new Set(),
  protocol: dmThreadProtocol,
});

export { localSpec };
