// @flow

import { requireNativeModule } from 'expo-modules-core';

const AESCryptoModule: {
  +hello: () => string,
} = requireNativeModule('AESCrypto');

export function hello(): string {
  return AESCryptoModule.hello();
}
