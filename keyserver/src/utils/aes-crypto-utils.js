// @flow

import crypto from 'crypto';

import {
  generateKeyCommon,
  encryptCommon,
  decryptCommon,
} from 'lib/media/aes-crypto-utils-common.js';

// crypto.webcrypto was introduced in Node 15.10.0.
// It is not defined in Flow so we need a cast
const commonCrypto: Crypto = (crypto: any).webcrypto;

async function generateKey(): Promise<Uint8Array> {
  return await generateKeyCommon(commonCrypto);
}

async function encrypt(
  keyBytes: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  return await encryptCommon(commonCrypto, keyBytes, plaintext);
}

async function decrypt(
  keyBytes: Uint8Array,
  sealedData: Uint8Array,
): Promise<Uint8Array> {
  return await decryptCommon(commonCrypto, keyBytes, sealedData);
}

export { generateKey, encrypt, decrypt };
