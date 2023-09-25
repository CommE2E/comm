// @flow

import brotliCompress from 'brotli/compress.js';

import type { CompressedData } from 'lib/types/compression-types.js';

// mode: 1 corresponds to text content
// https://github.com/foliojs/brotli.js#brotlicompressbuffer-istext--false
const brotliCompressOptions = { mode: 1 };

type CompressionResult =
  | { +compressed: true, +result: CompressedData }
  | { +compressed: false, +result: string };
function compressMessage(message: string): CompressionResult {
  const buffer = Buffer.from(message, 'utf-8');
  const brotliResult = brotliCompress(buffer, brotliCompressOptions);
  if (!brotliResult) {
    // If brotli.js returns a falsey result, that means the input was too short
    // to compress
    // https://github.com/foliojs/brotli.js/issues/19
    // https://github.com/foliojs/brotli.js/issues/36
    return { compressed: false, result: message };
  }
  const base64Encoded = Buffer.from(brotliResult).toString('base64');
  const result = {
    algo: 'brotli+base64',
    data: base64Encoded,
  };
  return { compressed: true, result };
}

export { compressMessage };
