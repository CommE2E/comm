// @flow

import {
  generateKeyCommon,
  encryptCommon,
  decryptCommon,
} from 'lib/media/aes-crypto-utils-common.js';

async function generateKey(): Promise<Uint8Array> {
  return await generateKeyCommon(crypto);
}

async function encrypt(
  keyBytes: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  return await encryptCommon(crypto, keyBytes, plaintext);
}

async function decrypt(
  keyBytes: Uint8Array,
  sealedData: Uint8Array,
): Promise<Uint8Array> {
  return await decryptCommon(crypto, keyBytes, sealedData);
}

export { generateKey, encrypt, decrypt };
