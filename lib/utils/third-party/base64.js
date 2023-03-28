/*
MIT LICENSE
Copyright 2011 Jon Leighton
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions: The above copyright notice and this
permission notice shall be included in all copies or substantial portions of the
Software.  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

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
 * This function is a slightly modified version of
 * https://gist.github.com/jonleighton/958841
 */
// @flow
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

export { base64FromIntArray };
