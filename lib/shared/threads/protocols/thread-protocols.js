// @flow

import { dmThreadProtocol } from './dm-thread-protocol.js';
import { keyserverThreadProtocol } from './keyserver-thread-protocol.js';

const protocols = [dmThreadProtocol, keyserverThreadProtocol];

export { protocols };
