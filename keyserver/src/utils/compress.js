// @flow

import zlib from 'zlib';

import type { CompressedData } from 'lib/types/compression-types.js';

const brotliOptions = {
  params: {
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
  },
};
const minimumSizeForCompression = 4096; // bytes

type CompressionResult =
  | { +compressed: true, +result: CompressedData }
  | { +compressed: false, +result: string };
function compressMessage(message: string): CompressionResult {
  const bytesInMessage = new Blob([message]).size;
  if (bytesInMessage < minimumSizeForCompression) {
    return { compressed: false, result: message };
  }
  const brotliResult = zlib.brotliCompressSync(message, brotliOptions);
  const base64Encoded = brotliResult.toString('base64');
  const result = {
    algo: 'brotli+base64',
    data: base64Encoded,
  };
  return { compressed: true, result };
}

export { compressMessage };
