// @flow

import { usingStagingServices } from '../utils/using-staging-services.js';

const tunnnelbrokerURL: string = usingStagingServices
  ? 'wss://tunnelbroker.staging.commtechnologies.org:51001'
  : 'wss://tunnelbroker.commtechnologies.org:51001';

export { tunnnelbrokerURL };
