// @flow

import type { ThreadSpec } from './thread-spec.js';

const communitySecretSubthreadSpec: ThreadSpec = Object.freeze({
  traits: new Set(['communitySubthread']),
});

export { communitySecretSubthreadSpec };
