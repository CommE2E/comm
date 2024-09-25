// @flow

import { requireNativeModule } from 'expo-modules-core';
import invariant from 'invariant';

const KEY_SIZE = 32; // bytes
const IV_LENGTH = 12; // bytes, IV - unique Initialization Vector (nonce)
const TAG_LENGTH = 16; // bytes - GCM auth tag

const AESCryptoModule: {
  +generateKey: (destination: Uint8Array) => void,
  +generateIV: (destination: Uint8Array) => void,
  +encrypt: (
    key: Uint8Array,
    data: Uint8Array,
    destination: Uint8Array,
    initializationVector: Uint8Array,
  ) => void,
  +decrypt: (
    key: Uint8Array,
    data: Uint8Array,
    destination: Uint8Array,
  ) => void,
} = requireNativeModule('AESCrypto');

export function generateKey(): Uint8Array {
  const keyBuffer = new Uint8Array(KEY_SIZE);
  AESCryptoModule.generateKey(keyBuffer);
  return keyBuffer;
}

export function generateIV(): Uint8Array {
  const ivBuffer = new Uint8Array(IV_LENGTH);
  AESCryptoModule.generateIV(ivBuffer);
  return ivBuffer;
}

export function encrypt(
  key: Uint8Array,
  data: Uint8Array,
  initializationVector?: ?Uint8Array,
): Uint8Array {
  const sealedDataBuffer = new Uint8Array(data.length + IV_LENGTH + TAG_LENGTH);
  const iv = initializationVector ?? new Uint8Array(0);
  AESCryptoModule.encrypt(key, data, sealedDataBuffer, iv);
  return sealedDataBuffer;
}

export function decrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  invariant(data.length >= IV_LENGTH + TAG_LENGTH, 'Invalid data length');
  const plaintextBuffer = new Uint8Array(data.length - IV_LENGTH - TAG_LENGTH);
  AESCryptoModule.decrypt(key, data, plaintextBuffer);
  return plaintextBuffer;
}
