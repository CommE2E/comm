// @flow

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

export { uintArrayToHexString, hexToUintArray };
