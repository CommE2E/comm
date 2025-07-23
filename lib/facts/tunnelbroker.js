// @flow

import { isDev } from '../utils/dev-utils.js';

const tunnnelbrokerURL: string = isDev
  ? 'ws://192.168.83.107:51001'
  : 'wss://tunnelbroker.commtechnologies.org:51001';

export { tunnnelbrokerURL };
