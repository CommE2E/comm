// @flow

import { farcasterThreadProtocol } from './protocols/farcaster-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';
import type { MemberInfoSansPermissions } from '../../types/minimally-encoded-thread-permissions-types.js';

const farcasterGroupSpec: ThreadSpec<MemberInfoSansPermissions> = Object.freeze(
  {
    traits: new Set(),
    protocol: () => farcasterThreadProtocol,
    threadLabel: 'Farcaster Group',
  },
);

export { farcasterGroupSpec };
