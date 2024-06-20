// @flow

import { isDev } from '../utils/dev-utils.js';

const identitySearchURL: string = isDev
  ? 'ws://localhost:51004'
  : 'wss://identity.commtechnologies.org:51004';

export { identitySearchURL };
