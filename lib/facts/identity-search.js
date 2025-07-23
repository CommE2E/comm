// @flow

import { isDev } from '../utils/dev-utils.js';

const identitySearchURL: string = isDev
  ? 'ws://192.168.100.9:51004'
  : 'ws://192.168.100.9:51004';

export { identitySearchURL };
