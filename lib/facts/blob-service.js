// @flow

import { isDev } from '../utils/dev-utils.js';

type BlobHTTPEndpoints = {
  GET_BLOB: { +path: '/blob/:blobHash', +method: 'GET' },
  ASSIGN_HOLDER: { +path: '/blob', +method: 'POST' },
  ASSIGN_MULTIPLE_HOLDERS: { +path: '/holders', +method: 'POST' },
  UPLOAD_BLOB: { +path: '/blob', +method: 'PUT' },
  DELETE_BLOB: { +path: '/blob', +method: 'DELETE' },
  REMOVE_MULTIPLE_HOLDERS: { +path: '/holders', +method: 'DELETE' },
};

export type BlobServiceHTTPEndpoint =
  BlobHTTPEndpoints[$Keys<BlobHTTPEndpoints>];

type BlobServiceConfig = {
  +url: string,
  +httpEndpoints: BlobHTTPEndpoints,
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
  ASSIGN_MULTIPLE_HOLDERS: {
    path: '/holders',
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
  REMOVE_MULTIPLE_HOLDERS: {
    path: '/holders',
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
