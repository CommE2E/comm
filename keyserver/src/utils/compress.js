// @flow

import { promisify } from 'util';
import zlib from 'zlib';

import type { CompressedData } from 'lib/types/compression-types.js';

const brotliOptions = {
  params: {
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
  },
};
const minimumSizeForCompression = 4096; // bytes

const brotliCompress = promisify(zlib.brotliCompress);

type CompressionResult =
  | { +compressed: true, +result: CompressedData }
  | { +compressed: false, +result: string };
async function compressMessage(message: string): Promise<CompressionResult> {
  const bytesInMessage = new Blob([message]).size;
  if (bytesInMessage < minimumSizeForCompression) {
    return { compressed: false, result: message };
  }
  const brotliResult = await brotliCompress(message, brotliOptions);
  const base64Encoded = brotliResult.toString('base64');
  const result = {
    algo: 'brotli+base64',
    data: base64Encoded,
  };
  return { compressed: true, result };
}

export { compressMessage };
