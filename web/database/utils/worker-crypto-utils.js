// @flow

const ENCRYPTION_ALGORITHM = 'AES-GCM';

type EncryptedData = {
  +iv: BufferSource,
  +ciphertext: Uint8Array,
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

function generateIV(): BufferSource {
  return crypto.getRandomValues(new Uint8Array(12));
}

async function encryptDatabaseFile(
  data: Uint8Array,
  key: CryptoKey,
): Promise<EncryptedData> {
  const iv = generateIV();
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
    },
    key,
    data,
  );
  return {
    ciphertext: new Uint8Array(ciphertext),
    iv,
  };
}

async function decryptDatabaseFile(
  encryptedData: EncryptedData,
  key: CryptoKey,
): Promise<Uint8Array> {
  const { ciphertext, iv } = encryptedData;
  const decrypted = await crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv,
    },
    key,
    ciphertext,
  );
  return new Uint8Array(decrypted);
}

export { generateDatabaseCryptoKey, encryptDatabaseFile, decryptDatabaseFile };
