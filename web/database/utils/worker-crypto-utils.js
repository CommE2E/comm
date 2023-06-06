// @flow

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const ENCRYPTION_KEY_USAGES: $ReadOnlyArray<CryptoKey$Usages> = [
  'encrypt',
  'decrypt',
];

type EncryptedData = {
  +iv: BufferSource,
  +ciphertext: Uint8Array,
};

function generateDatabaseCryptoKey({
  extractable,
}: {
  +extractable: boolean,
}): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: ENCRYPTION_ALGORITHM,
      length: 256,
    },
    extractable,
    ENCRYPTION_KEY_USAGES,
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

async function exportKeyToJWK(
  key: CryptoKey,
): Promise<SubtleCrypto$JsonWebKey> {
  return await crypto.subtle.exportKey('jwk', key);
}

async function importJWKKey(
  jwkKey: SubtleCrypto$JsonWebKey,
): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    jwkKey,
    ENCRYPTION_ALGORITHM,
    true,
    ENCRYPTION_KEY_USAGES,
  );
}

export {
  generateDatabaseCryptoKey,
  encryptDatabaseFile,
  decryptDatabaseFile,
  exportKeyToJWK,
  importJWKKey,
};
