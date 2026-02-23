// @flow

import { usingStagingServices } from '../utils/using-staging-services.js';

type IdentityServicePath = '/device_inbound_keys?device_id=';

type IdentityServiceEndpoint = {
  +path: IdentityServicePath,
  +method: 'PUT' | 'GET' | 'POST' | 'DELETE',
};

const httpEndpoints = Object.freeze({
  GET_INBOUND_KEYS: {
    path: '/device_inbound_keys?device_id=',
    method: 'GET',
  },
});

type IdentityServiceConfig = {
  +defaultURL: string,
  +defaultHttpURL: string,
  +httpEndpoints: { +[endpoint: string]: IdentityServiceEndpoint },
};

const config: IdentityServiceConfig = {
  defaultURL: usingStagingServices
    ? 'https://identity.staging.commtechnologies.org:50054'
    : 'https://identity.commtechnologies.org:50054',
  defaultHttpURL: usingStagingServices
    ? 'https://identity.staging.commtechnologies.org:51004'
    : 'https://identity.commtechnologies.org:51004',
  httpEndpoints,
};

export default config;
