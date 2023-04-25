// @flow

import invariant from 'invariant';

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

function getBlobFetchableURL(holder: string): string {
  return `${blobServiceConfig.url}/blob/${holder}`;
}

export {
  makeBlobServiceURI,
  isBlobServiceURI,
  holderFromURI,
  holderFromBlobServiceURI,
  getBlobFetchableURL,
};
