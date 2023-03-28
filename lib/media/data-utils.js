// @flow

import { fileInfoFromData } from './file-utils.js';
import { base64FromIntArray } from '../utils/third-party/base64.js';

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

export {
  uintArrayToHexString,
  hexToUintArray,
  base64FromIntArray,
  uintArrayToDataURL,
};
