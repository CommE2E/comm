// @flow

import { keyserverThreadProtocol } from './keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const communitySecretAnnouncementSubthreadSpec: ThreadSpec = Object.freeze({
  traits: new Set(['communitySubthread', 'announcement']),
  protocol: keyserverThreadProtocol,
});

export { communitySecretAnnouncementSubthreadSpec };
