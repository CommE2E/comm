// @flow

import { usingStagingServices } from '../utils/using-staging-services.js';

const identitySearchURL: string = usingStagingServices
  ? 'wss://identity.staging.commtechnologies.org:51004'
  : 'wss://identity.commtechnologies.org:51004';

export { identitySearchURL };
