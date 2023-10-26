// @flow

import { isDev } from '../utils/dev-utils.js';

const tunnnelbrokerURL: string = isDev
  ? 'ws://127.0.0.1:51001'
  : 'https://tunnelbroker.commtechnologies.org';

export { tunnnelbrokerURL };
