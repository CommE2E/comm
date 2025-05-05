// @flow

import { keyserverThreadProtocol } from './protocols/keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';
import type { MemberInfoSansPermissions } from '../../types/minimally-encoded-thread-permissions-types.js';

const sidebarSpec: ThreadSpec<MemberInfoSansPermissions> = Object.freeze({
  traits: new Set(['sidebar']),
  protocol: keyserverThreadProtocol,
  threadLabel: 'Thread',
});

export { sidebarSpec };
