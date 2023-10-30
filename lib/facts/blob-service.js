// @flow

import { isDev } from '../utils/dev-utils.js';

type BlobServicePath = '/blob/:blobHash' | '/blob';

export type BlobServiceHTTPEndpoint = {
  +path: BlobServicePath,
  +method: 'GET' | 'POST' | 'PUT' | 'DELETE',
};

type BlobServiceConfig = {
  +url: string,
  +httpEndpoints: { +[endpoint: string]: BlobServiceHTTPEndpoint },
};

const httpEndpoints = Object.freeze({
  GET_BLOB: {
    path: '/blob/:blobHash',
    method: 'GET',
  },
  ASSIGN_HOLDER: {
    path: '/blob',
    method: 'POST',
  },
  UPLOAD_BLOB: {
    path: '/blob',
    method: 'PUT',
  },
  DELETE_BLOB: {
    path: '/blob',
    method: 'DELETE',
  },
});

const config: BlobServiceConfig = {
  url: isDev
    ? 'https://blob.staging.commtechnologies.org'
    : 'https://blob.commtechnologies.org',
  httpEndpoints,
};

export default config;
