// @flow

import type { AesGcmParams, Crypto, CryptoKey } from './crypto-types.js';

declare var crypto: Crypto;

const ENCRYPTION_ALGORITHM = 'AES-GCM';

type EncryptionResult = {
  iv: BufferSource,
  cipher: ArrayBuffer,
};

function generateCryptoKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: ENCRYPTION_ALGORITHM,
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

function generateIv(): BufferSource {
  return crypto.getRandomValues(new Uint8Array(12));
}

async function encrypt(
  data: ArrayBuffer,
  key: CryptoKey,
): Promise<EncryptionResult> {
  const iv = generateIv();
  const params: AesGcmParams = {
    name: ENCRYPTION_ALGORITHM,
    iv: iv,
  };
  const cipher = await crypto.subtle.encrypt(params, key, data);
  return {
    cipher,
    iv,
  };
}

async function decrypt(
  cipher: ArrayBuffer,
  key: CryptoKey,
  iv: BufferSource,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv,
    },
    key,
    cipher,
  );
}

export { generateCryptoKey, encrypt, decrypt };
