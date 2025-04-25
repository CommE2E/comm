// @flow

import { keyserverThreadProtocol } from './protocols/keyserver-thread-protocol.js';
import type { ThreadSpec } from './thread-spec.js';

const communitySecretAnnouncementSubthreadSpec: ThreadSpec = Object.freeze({
  traits: new Set(['communitySubthread', 'announcement']),
  protocol: keyserverThreadProtocol,
  threadLabel: 'Secret',
});

export { communitySecretAnnouncementSubthreadSpec };
