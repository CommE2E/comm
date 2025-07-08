// @flow

import { dmThreadProtocol } from './protocols/dm-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';
import type { MinimallyEncodedThickMemberInfo } from '../../types/minimally-encoded-thread-permissions-types.js';

const localSpec: ThreadSpec<MinimallyEncodedThickMemberInfo> = Object.freeze({
  traits: new Set(),
  protocol: () => dmThreadProtocol,
  threadLabel: 'Local DM',
});

export { localSpec };
