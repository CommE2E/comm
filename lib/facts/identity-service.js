// @flow

import { isDev } from '../utils/dev-utils.js';

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
  defaultURL: isDev
    ? 'http://192.168.100.9:50054'
    : 'https://identity.commtechnologies.org:50054',
  defaultHttpURL: isDev
    ? 'http://192.168.100.9:51004'
    : 'https://identity.commtechnologies.org:51004',
  httpEndpoints,
};

export default config;
