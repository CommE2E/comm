// @flow

import invariant from 'invariant';

/**
 * PKCS#7 padding function for `Uint8Array` data.
 *
 * @param {Uint8Array} data - The data to be padded.
 * @param {number} blockSizeBytes - The block size in bytes.
 * @returns {Uint8Array} The padded data as a new Uint8Array.
 */
function pkcs7pad(data: Uint8Array, blockSizeBytes: number): Uint8Array {
  invariant(blockSizeBytes > 0, 'block size must be positive');
  invariant(blockSizeBytes < 256, 'block size must be less than 256');
  const padding = blockSizeBytes - (data.length % blockSizeBytes);
  const padded = new Uint8Array(data.length + padding);
  padded.set(data);
  padded.fill(padding, data.length);
  return padded;
}

/**
 * PKCS#7 unpadding function for `Uint8Array` data.
 *
 * @param {Uint8Array} data - The padded data to be unpadded.
 * @returns {Uint8Array} The unpadded data as a new Uint8Array.
 * @throws {Error} If the padding is invalid.
 */
function pkcs7unpad(data: Uint8Array): Uint8Array {
  const padding = data[data.length - 1];
  invariant(padding > 0, 'padding must be positive');
  invariant(data.length >= padding, 'data length must be at least padding');
  invariant(
    data.subarray(data.length - padding).every(x => x === padding),
    'invalid padding',
  );

  const unpadded = data.subarray(0, data.length - padding);
  return unpadded;
}

export { pkcs7pad, pkcs7unpad };
