// @flow

import { farcasterThreadProtocol } from './protocols/farcaster-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';
import type { MemberInfoSansPermissions } from '../../types/minimally-encoded-thread-permissions-types.js';

const farcasterPersonalSpec: ThreadSpec<MemberInfoSansPermissions> =
  Object.freeze({
    traits: new Set(['personal']),
    protocol: () => farcasterThreadProtocol,
    threadLabel: 'Farcaster Personal',
  });

export { farcasterPersonalSpec };
