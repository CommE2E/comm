// @flow

import { isDev } from '../utils/dev-utils.js';

const tunnnelbrokerURL: string = (isDev || true)
  ? 'wss://tunnelbroker.staging.commtechnologies.org:51001'
  : 'wss://tunnelbroker.commtechnologies.org:51001';

export { tunnnelbrokerURL };
