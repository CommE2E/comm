// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import { tShape } from 'lib/utils/validation-utils.js';

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const ENCRYPTION_KEY_USAGES: $ReadOnlyArray<CryptoKey$Usages> = [
  'encrypt',
  'decrypt',
];

export type EncryptedData = {
  +iv: BufferSource,
  +ciphertext: Uint8Array,
};

export const encryptedAESDataValidator: TInterface<EncryptedData> =
  tShape<EncryptedData>({
    iv: t.irreducible('Uint8Array', x => x instanceof Uint8Array),
    ciphertext: t.irreducible('Uint8Array', x => x instanceof Uint8Array),
  });

export const cryptoKeyValidator: TInterface<CryptoKey> = tShape<CryptoKey>({
  algorithm: t.Object,
  extractable: t.Boolean,
  type: t.enums.of(['secret', 'public', 'private']),
  usages: t.list(
    t.enums.of([
      'encrypt',
      'decrypt',
      'sign',
      'verify',
      'deriveKey',
      'deriveBits',
      'wrapKey',
      'unwrapKey',
    ]),
  ),
});

export const subtleCrypto$JsonWebKeyValidator: TInterface<SubtleCrypto$JsonWebKey> =
  tShape({
    alg: t.maybe(t.String),
    crv: t.maybe(t.String),
    d: t.maybe(t.String),
    dp: t.maybe(t.String),
    dq: t.maybe(t.String),
    e: t.maybe(t.String),
    ext: t.maybe(t.Boolean),
    k: t.maybe(t.String),
    key_ops: t.maybe(t.list(t.String)),
    kty: t.maybe(t.String),
    n: t.maybe(t.String),
    oth: t.maybe(t.list(t.Object)),
    p: t.maybe(t.String),
    q: t.maybe(t.String),
    qi: t.maybe(t.String),
    use: t.maybe(t.String),
    x: t.maybe(t.String),
    y: t.maybe(t.String),
  });

export const extendedCryptoKeyValidator: TUnion<
  CryptoKey | SubtleCrypto$JsonWebKey,
> = t.union([cryptoKeyValidator, subtleCrypto$JsonWebKeyValidator]);

function generateCryptoKey({
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

function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

async function encryptData(
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

async function decryptData(
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
  generateCryptoKey,
  encryptData,
  decryptData,
  exportKeyToJWK,
  importJWKKey,
};
