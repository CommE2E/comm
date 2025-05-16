// @flow

import { dmThreadProtocol } from './dm-thread-protocol.js';
import { keyserverThreadProtocol } from './keyserver-thread-protocol.js';
import type { ThreadProtocol } from '../thread-spec.js';

const protocols = (): $ReadOnlyArray<ThreadProtocol<any>> => [
  dmThreadProtocol,
  keyserverThreadProtocol,
];

function getProtocolByThreadID(threadID?: ?string): ?ThreadProtocol<any> {
  if (!threadID) {
    return null;
  }
  return protocols().find(p => p.threadIDMatchesProtocol(threadID));
}

export { protocols, getProtocolByThreadID };
