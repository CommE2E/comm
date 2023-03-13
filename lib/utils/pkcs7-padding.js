// @flow

/**
 * This file contains functions for PKCS#7 padding and unpadding, as well as
 * functions for padding on the block basis. This is used to let the padding
 * to be larger than maximum PKCS#7 padding block size (255 bytes).
 *
 * The main idea of this concept is to pad the input using the standard
 * PKCS#7 padding, and then pad the result to the neares multiple of
 * superblocks (blocks of blocks). The procedure is analogous
 * to the standard PKCS#7 padding, but operates on the block basis instead of
 * the byte basis. The fill value of the padding is the number of blocks added.
 *
 * The PKCS#7 padding is described in RFC 5652, section 6.3.
 */

import invariant from 'invariant';

export type PaddingConfiguration = {
  +blockSizeBytes: number,
  +superblockSizeBlocks: number,
};

/**
 * The padding configuration for 10KB superblocks.
 * The block size is 250 bytes, and the superblock size is 40 blocks.
 */
const PKCS7_10KB: PaddingConfiguration = {
  blockSizeBytes: 250,
  superblockSizeBlocks: 40,
};

/**
 * Pads the input using the extended PKCS#7 padding (superblock padding).
 * The input is first padded using the standard PKCS#7 padding, and then
 * padded to the nearest multiple of superblocks (blocks of blocks).
 *
 * @param {Uint8Array} data - The input to be padded.
 * @param {PaddingConfiguration} paddingConfiguration - The padding
 * configuration. Defaults to multiple of 10KB. See {@link PKCS7_10KB}.
 * @returns {Uint8Array} The padded input.
 */
function pad(
  data: Uint8Array,
  { blockSizeBytes, superblockSizeBlocks }: PaddingConfiguration = PKCS7_10KB,
): Uint8Array {
  const pkcs7Padded = pkcs7pad(data, blockSizeBytes);
  return superblockPad(pkcs7Padded, blockSizeBytes, superblockSizeBlocks);
}

/**
 * Unpads the input using the extended PKCS#7 padding (superblock padding).
 * The input is first unpadded on the block basis, and then unpadded using
 * the standard PKCS#7 padding.
 *
 * @param {Uint8Array} data - The input to be unpadded.
 * @param {PaddingConfiguration} paddingConfiguration - The padding
 * configuration. Defaults to multiple of 10KB. See {@link PKCS7_10KB}.
 * @returns {Uint8Array} The unpadded input.
 */
function unpad(
  data: Uint8Array,
  { blockSizeBytes }: PaddingConfiguration = PKCS7_10KB,
): Uint8Array {
  const blockUnpadded = superblockUnpad(data, blockSizeBytes);
  return pkcs7unpad(blockUnpadded);
}

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

/**
 * Pads the PKCS#7-padded input on the block basis. Pads the input to have
 * a length that is a multiple of the superblock size. The input must already
 * be PKCS#7 padded to the block size.
 *
 * @param {Uint8Array} data - The PKCS#7 padded input to be block-padded.
 * @param {number} blockSizeBytes - The block size in bytes.
 * @param {number} superblockSize - The superblock size in blocks.
 * @returns {Uint8Array} The block-padded data as a new Uint8Array.
 */
function superblockPad(
  data: Uint8Array,
  blockSizeBytes: number,
  superblockSize: number,
): Uint8Array {
  invariant(
    data.length % blockSizeBytes === 0,
    'data length must be a multiple of block size',
  );
  invariant(superblockSize > 0, 'superblock size must be positive');
  invariant(superblockSize <= 255, 'superblock size must be less than 256');
  invariant(blockSizeBytes > 0, 'block size must be positive');
  invariant(blockSizeBytes <= 255, 'block size must be less than 256');

  const numBlocks = data.length / blockSizeBytes;
  const paddingBlocks = superblockSize - (numBlocks % superblockSize);
  const paddingValue = paddingBlocks;

  const outputBuffer = new Uint8Array(
    data.length + paddingBlocks * blockSizeBytes,
  );
  outputBuffer.set(data);
  outputBuffer.fill(paddingValue, data.length);
  return outputBuffer;
}

/**
 * Unpads the block-padded input on the block basis.
 *
 * @param {Uint8Array} data  - The block-padded input to be unpaded.
 * @param {number} blockSizeBytes - The block size in bytes.
 * @returns {Uint8Array} - The unpadded data as a new Uint8Array.
 */
function superblockUnpad(data: Uint8Array, blockSizeBytes: number): Uint8Array {
  invariant(blockSizeBytes > 0, 'block size must be positive');
  invariant(blockSizeBytes <= 255, 'block size must be less than 256');
  invariant(
    data.length % blockSizeBytes === 0,
    'data length must be a multiple of block size',
  );

  const numBlocks = data.length / blockSizeBytes;
  const paddingBlocks = data[data.length - 1];
  invariant(paddingBlocks > 0 && paddingBlocks < numBlocks, 'invalid padding');

  const unpaddedBlocks = numBlocks - paddingBlocks;
  const unpaddedLengthBytes = unpaddedBlocks * blockSizeBytes;
  invariant(
    data.subarray(unpaddedLengthBytes).every(x => x === paddingBlocks),
    'invalid padding',
  );

  const unpaddedData = data.subarray(0, unpaddedLengthBytes);
  return unpaddedData;
}

export { PKCS7_10KB, pad, unpad };

// exported for testing purposes only
export const testing = {
  pkcs7pad,
  pkcs7unpad,
  superblockPad,
  superblockUnpad,
};
