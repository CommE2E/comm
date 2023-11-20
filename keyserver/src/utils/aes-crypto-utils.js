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

function generateKey(): Promise<Uint8Array> {
  return generateKeyCommon(commonCrypto);
}

function encrypt(
  keyBytes: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  return encryptCommon(commonCrypto, keyBytes, plaintext);
}

function decrypt(
  keyBytes: Uint8Array,
  sealedData: Uint8Array,
): Promise<Uint8Array> {
  return decryptCommon(commonCrypto, keyBytes, sealedData);
}

export { generateKey, encrypt, decrypt };
