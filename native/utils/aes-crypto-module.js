// @flow

import { requireNativeModule } from 'expo-modules-core';
import invariant from 'invariant';

const KEY_SIZE = 32; // bytes
const IV_LENGTH = 12; // bytes, IV - unique Initialization Vector (nonce)
const TAG_LENGTH = 16; // bytes - GCM auth tag

const AESCryptoModule: {
  +generateKey: (destination: Uint8Array) => void,
  +encrypt: (
    key: Uint8Array,
    data: Uint8Array,
    destination: Uint8Array,
  ) => Promise<void>,
  +decrypt: (
    key: Uint8Array,
    data: Uint8Array,
    destination: Uint8Array,
  ) => Promise<void>,
} = requireNativeModule('AESCrypto');

export function generateKey(): Uint8Array {
  const keyBuffer = new Uint8Array(KEY_SIZE);
  AESCryptoModule.generateKey(keyBuffer);
  return keyBuffer;
}

export async function encrypt(
  key: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const sealedDataBuffer = new Uint8Array(data.length + IV_LENGTH + TAG_LENGTH);
  await AESCryptoModule.encrypt(key, data, sealedDataBuffer);
  return sealedDataBuffer;
}

export async function decrypt(
  key: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  invariant(data.length >= IV_LENGTH + TAG_LENGTH, 'Invalid data length');
  const plaintextBuffer = new Uint8Array(data.length - IV_LENGTH - TAG_LENGTH);
  await AESCryptoModule.decrypt(key, data, plaintextBuffer);
  return plaintextBuffer;
}
