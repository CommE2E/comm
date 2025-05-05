// @flow

import { dmThreadProtocol } from './dm-thread-protocol.js';
import { keyserverThreadProtocol } from './keyserver-thread-protocol.js';
import type { ThreadProtocol } from '../thread-spec.js';

const protocols = (): $ReadOnlyArray<ThreadProtocol<any>> => [
  dmThreadProtocol,
  keyserverThreadProtocol,
];

export { protocols };
