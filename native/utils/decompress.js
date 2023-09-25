// @flow

import decompress from 'brotli/decompress.js';
import { Buffer } from 'buffer';
import invariant from 'invariant';

import type { CompressedData } from 'lib/types/compression-types.js';

function decompressMessage(message: CompressedData): string {
  invariant(message.algo === 'brotli+base64', 'only supports brotli+base64');
  const inBuffer = Buffer.from(message.data, 'base64');
  const decompressed = decompress(inBuffer);
  const outBuffer = Buffer.from(decompressed);
  return outBuffer.toString('utf-8');
}

export { decompressMessage };
