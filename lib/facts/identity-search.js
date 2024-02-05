// @flow

import { isDev } from '../utils/dev-utils.js';

const identitySearchURL: string = isDev
  ? 'wss://identity.staging.commtechnologies.org:51004'
  : 'wss://identity.commtechnologies.org:51004';

export { identitySearchURL };
