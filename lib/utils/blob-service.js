// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import { toBase64URL } from './base64.js';
import { replacePathParams, type URLPathParams } from './url-utils.js';
import type { BlobServiceHTTPEndpoint } from '../facts/blob-service.js';
import blobServiceConfig from '../facts/blob-service.js';

const BLOB_SERVICE_URI_PREFIX = 'comm-blob-service://';

function makeBlobServiceURI(blobHash: string): string {
  return `${BLOB_SERVICE_URI_PREFIX}${blobHash}`;
}

function isBlobServiceURI(uri: string): boolean {
  return uri.startsWith(BLOB_SERVICE_URI_PREFIX);
}

/**
 * Returns the base64url-encoded blob hash from a blob service URI.
 * Throws an error if the URI is not a blob service URI.
 */
function blobHashFromBlobServiceURI(uri: string): string {
  invariant(isBlobServiceURI(uri), 'Not a blob service URI');
  return uri.slice(BLOB_SERVICE_URI_PREFIX.length);
}

/**
 * Returns the base64url-encoded blob hash from a blob service URI.
 * Returns null if the URI is not a blob service URI.
 */
function blobHashFromURI(uri: string): ?string {
  if (!isBlobServiceURI(uri)) {
    return null;
  }
  return blobHashFromBlobServiceURI(uri);
}

function makeBlobServiceEndpointURL(
  endpoint: BlobServiceHTTPEndpoint,
  params: URLPathParams = {},
): string {
  const path = replacePathParams(endpoint.path, params);
  return `${blobServiceConfig.url}${path}`;
}

function getBlobFetchableURL(blobHash: string): string {
  return makeBlobServiceEndpointURL(blobServiceConfig.httpEndpoints.GET_BLOB, {
    blobHash,
  });
}

/**
 * Generates random blob holder prefixed by current device ID if present
 */
function generateBlobHolder(deviceID?: ?string): string {
  const randomID = uuid.v4();
  if (!deviceID) {
    return randomID;
  }
  const urlSafeDeviceID = toBase64URL(deviceID);
  return `${urlSafeDeviceID}:${uuid.v4()}`;
}

export {
  makeBlobServiceURI,
  isBlobServiceURI,
  blobHashFromURI,
  blobHashFromBlobServiceURI,
  generateBlobHolder,
  getBlobFetchableURL,
  makeBlobServiceEndpointURL,
};
