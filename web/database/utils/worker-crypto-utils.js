// @flow

const ENCRYPTION_ALGORITHM = 'AES-GCM';

type EncryptionResult = {
  +iv: BufferSource,
  +cipher: ArrayBuffer,
};

function generateDatabaseCryptoKey(): Promise<CryptoKey> {
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

async function encryptDatabaseFile(
  data: ArrayBuffer,
  key: CryptoKey,
): Promise<EncryptionResult> {
  const iv = generateIv();
  const cipher = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
    },
    key,
    data,
  );
  return {
    cipher,
    iv,
  };
}

async function decryptDatabaseFile(
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

export { generateDatabaseCryptoKey, encryptDatabaseFile, decryptDatabaseFile };
