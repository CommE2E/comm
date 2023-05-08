// @flow

import invariant from 'invariant';

import type { BlobServiceHTTPEndpoint } from '../facts/blob-service.js';
import blobServiceConfig from '../facts/blob-service.js';

const BLOB_SERVICE_URI_PREFIX = 'comm-blob-service://';

function makeBlobServiceURI(holder: string): string {
  return `${BLOB_SERVICE_URI_PREFIX}${holder}`;
}

function isBlobServiceURI(uri: string): boolean {
  return uri.startsWith(BLOB_SERVICE_URI_PREFIX);
}

function holderFromBlobServiceURI(uri: string): string {
  invariant(isBlobServiceURI(uri), 'Not a blob service URI');
  return uri.slice(BLOB_SERVICE_URI_PREFIX.length);
}

function holderFromURI(uri: string): ?string {
  if (!isBlobServiceURI(uri)) {
    return null;
  }
  return holderFromBlobServiceURI(uri);
}

function makeBlobServiceEndpointURL(
  endpoint: BlobServiceHTTPEndpoint,
  params: { +[name: string]: string } = {},
): string {
  let path = endpoint.path;
  for (const name in params) {
    path = path.replace(`:${name}`, params[name]);
  }
  return `${blobServiceConfig.url}${path}`;
}

function getBlobFetchableURL(holder: string): string {
  return makeBlobServiceEndpointURL(blobServiceConfig.httpEndpoints.GET_BLOB, {
    holder,
  });
}

export {
  makeBlobServiceURI,
  isBlobServiceURI,
  holderFromURI,
  holderFromBlobServiceURI,
  getBlobFetchableURL,
  makeBlobServiceEndpointURL,
};
