// @flow

import { keyserverThreadProtocol } from './protocols/keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';
import type { MemberInfoSansPermissions } from '../../types/minimally-encoded-thread-permissions-types.js';

const communityOpenAnnouncementSubthreadSpec: ThreadSpec<MemberInfoSansPermissions> =
  Object.freeze({
    traits: new Set(['communitySubthread', 'announcement']),
    protocol: () => keyserverThreadProtocol,
    threadLabel: 'Open',
  });

export { communityOpenAnnouncementSubthreadSpec };
