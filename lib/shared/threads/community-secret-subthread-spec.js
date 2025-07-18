// @flow

import { keyserverThreadProtocol } from './protocols/keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';
import type { MemberInfoSansPermissions } from '../../types/minimally-encoded-thread-permissions-types.js';

const communitySecretSubthreadSpec: ThreadSpec<MemberInfoSansPermissions> =
  Object.freeze({
    traits: new Set(['communitySubthread']),
    protocol: () => keyserverThreadProtocol,
    threadLabel: 'Secret',
  });

export { communitySecretSubthreadSpec };
