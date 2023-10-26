// @flow

import { isDev } from '../utils/dev-utils.js';

const tunnnelbrokerURL: string = isDev
  ? 'ws://localhost:51001'
  : 'https://tunnelbroker.commtechnologies.org';

export { tunnnelbrokerURL };
