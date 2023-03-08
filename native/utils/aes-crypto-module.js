// @flow

import { requireNativeModule } from 'expo-modules-core';

const KEY_SIZE = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const AESCryptoModule: {
  +generateKey: (destination: Uint8Array) => void,
  +encrypt: (
    key: Uint8Array,
    data: Uint8Array,
    destination: Uint8Array,
  ) => void,
  +decrypt: (
    key: Uint8Array,
    data: Uint8Array,
    destination: Uint8Array,
  ) => void,
} = requireNativeModule('AESCrypto');

export function generateKey(): Uint8Array {
  const key = new Uint8Array(KEY_SIZE);
  AESCryptoModule.generateKey(key);
  return key;
}

export function encrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  const ciphertext = new Uint8Array(data.length + IV_LENGTH + TAG_LENGTH);
  AESCryptoModule.encrypt(key, data, ciphertext);
  return ciphertext;
}

export function decrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  const plaintext = new Uint8Array(data.length - IV_LENGTH - TAG_LENGTH);
  AESCryptoModule.decrypt(key, data, plaintext);
  return plaintext;
}
