// @flow

import { dmThreadProtocol } from './protocols/dm-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const thickSidebarSpec: ThreadSpec = Object.freeze({
  traits: new Set(['sidebar']),
  protocol: dmThreadProtocol,
  threadLabel: 'Thread',
});

export { thickSidebarSpec };
