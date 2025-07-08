// @flow

import { dmThreadProtocol } from './protocols/dm-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';
import type { MinimallyEncodedThickMemberInfo } from '../../types/minimally-encoded-thread-permissions-types.js';

const thickSidebarSpec: ThreadSpec<MinimallyEncodedThickMemberInfo> =
  Object.freeze({
    traits: new Set(['sidebar']),
    protocol: () => dmThreadProtocol,
    threadLabel: 'Thread',
  });

export { thickSidebarSpec };
