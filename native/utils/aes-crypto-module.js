// @flow

import { requireNativeModule } from 'expo-modules-core';

const KEY_SIZE = 32;

const AESCryptoModule: {
  +generateKey: (destination: Uint8Array) => void,
} = requireNativeModule('AESCrypto');

export function generateKey(): Uint8Array {
  const key = new Uint8Array(KEY_SIZE);
  AESCryptoModule.generateKey(key);
  return key;
}
