// @flow

import { fileInfoFromData } from './file-utils.js';

/**
 * Returns a hex string representation of the given Uint8Array.
 */
function uintArrayToHexString(data: Uint8Array): string {
  return Array.from(data)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Returns a Uint8Array representation of the given hex string.
 */
function hexToUintArray(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return result;
}

/**
 * Returns a data URL representation of the given Uint8Array.
 * Returns `null` if MIME type cannot be determined by reading the data header.
 */
function uintArrayToDataURL(bytes: Uint8Array): ?string {
  const base64 = base64FromIntArray(bytes);
  const { mime } = fileInfoFromData(bytes);
  if (!mime) {
    return null;
  }
  return `data:${mime};base64,${base64}`;
}

/**
 * Converts a Uint8Array to a base64 string. This is a temporary workaround
 * until we can use implement native method to directly save Uint8Array to file.
 *
 * It is ~4-6x faster than using
 * ```js
 * let base64 = await blobToDataURI(new Blob([bytes]));
 * base64 = base64.substring(base64.indexOf(',') + 1);
 * ```
 *
 * This function based on
 * - https://developer.mozilla.org/en-US/docs/Glossary/Base64
 * - https://gist.github.com/jonleighton/958841
 * - https://stackoverflow.com/a/12713326
 */
function base64FromIntArray(bytes: Uint8Array): string {
  let base64 = '';
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  const remainder = bytes.length % 3;
  const mainLength = bytes.length - remainder;

  let a, b, c, d;
  let chunk;
  for (let i = 0; i < mainLength; i += 3) {
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    a = (chunk & 16515072) >> 18;
    b = (chunk & 258048) >> 12;
    c = (chunk & 4032) >> 6;
    d = chunk & 63;
    base64 += alphabet[a] + alphabet[b] + alphabet[c] + alphabet[d];
  }

  if (remainder === 1) {
    chunk = bytes[mainLength];
    a = (chunk & 252) >> 2;
    b = (chunk & 3) << 4;
    base64 += alphabet[a] + alphabet[b] + '==';
  } else if (remainder === 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
    a = (chunk & 64512) >> 10;
    b = (chunk & 1008) >> 4;
    c = (chunk & 15) << 2;
    base64 += alphabet[a] + alphabet[b] + alphabet[c] + '=';
  }
  return base64;
}

export {
  uintArrayToHexString,
  hexToUintArray,
  base64FromIntArray,
  uintArrayToDataURL,
};
