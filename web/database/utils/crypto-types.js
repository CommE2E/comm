// @flow

type Algorithm = {
  name: string,
};

type AlgorithmIdentifier = Algorithm | string;

type HashAlgorithmIdentifier = AlgorithmIdentifier;

type NamedCurve = string;

type RsaOaepParams = {
  ...Algorithm,
  +label?: BufferSource,
};

type AesCtrParams = {
  ...Algorithm,
  +counter: BufferSource,
  +length: number,
};

type AesCbcParams = {
  ...Algorithm,
  +iv: BufferSource,
};

export type AesGcmParams = {
  ...Algorithm,
  +additionalData?: BufferSource,
  +iv: BufferSource,
  +tagLength?: number,
};

type EcdhKeyDeriveParams = {
  ...Algorithm,
  +public: CryptoKey,
};

type HkdfParams = {
  ...Algorithm,
  +hash: HashAlgorithmIdentifier,
  +info: BufferSource,
  +salt: BufferSource,
};

type Pbkdf2Params = {
  ...Algorithm,
  +hash: HashAlgorithmIdentifier,
  +iterations: number,
  +salt: BufferSource,
};

type AesDerivedKeyParams = {
  ...Algorithm,
  +length: number,
};

type HmacImportParams = {
  ...Algorithm,
  +hash: HashAlgorithmIdentifier,
  +length?: number,
};

type RsaHashedKeyGenParams = {
  ...Algorithm,
  +hash: HashAlgorithmIdentifier,
};

type HmacKeyGenParams = {
  ...Algorithm,
  +hash: HashAlgorithmIdentifier,
  +length?: number,
};

type RsaHashedImportParams = {
  ...Algorithm,
  +hash: HashAlgorithmIdentifier,
};

type EcKeyImportParams = {
  ...Algorithm,
  +namedCurve: NamedCurve,
};

type AesKeyAlgorithm = {
  ...Algorithm,
  +length: number,
};

type RsaPssParams = {
  ...Algorithm,
  +saltLength: number,
};

type EcdsaParams = {
  ...Algorithm,
  +hash: HashAlgorithmIdentifier,
};

type AesKeyGenParams = {
  ...Algorithm,
  +length: number,
};

type RsaOtherPrimesInfo = {
  +d?: string,
  +r?: string,
  +t?: string,
};

interface JsonWebKey {
  +alg?: string;
  +crv?: string;
  +d?: string;
  +dp?: string;
  +dq?: string;
  +e?: string;
  +ext?: boolean;
  +k?: string;
  +key_ops?: $ReadOnlyArray<string>;
  +kty?: string;
  +n?: string;
  +oth?: $ReadOnlyArray<RsaOtherPrimesInfo>;
  +p?: string;
  +q?: string;
  +qi?: string;
  +use?: string;
  +x?: string;
  +y?: string;
}

type KeyFormatWithoutJwk = 'pkcs8' | 'raw' | 'spki';
type KeyFormat = 'jwk' | KeyFormatWithoutJwk;

export type SubtleCrypto = {
  decrypt(
    algorithm:
      | AlgorithmIdentifier
      | RsaOaepParams
      | AesCtrParams
      | AesCbcParams
      | AesGcmParams,
    key: CryptoKey,
    data: BufferSource,
  ): Promise<ArrayBuffer>,
  deriveBits(
    algorithm:
      | AlgorithmIdentifier
      | EcdhKeyDeriveParams
      | HkdfParams
      | Pbkdf2Params,
    baseKey: CryptoKey,
    length: number,
  ): Promise<ArrayBuffer>,
  deriveKey(
    algorithm:
      | AlgorithmIdentifier
      | EcdhKeyDeriveParams
      | HkdfParams
      | Pbkdf2Params,
    baseKey: CryptoKey,
    derivedKeyType:
      | AlgorithmIdentifier
      | AesDerivedKeyParams
      | HmacImportParams
      | HkdfParams
      | Pbkdf2Params,
    extractable: boolean,
    keyUsages: $ReadOnlyArray<KeyUsage>,
  ): Promise<CryptoKey>,
  digest(
    algorithm: AlgorithmIdentifier,
    data: BufferSource,
  ): Promise<ArrayBuffer>,
  encrypt(
    algorithm:
      | AlgorithmIdentifier
      | RsaOaepParams
      | AesCtrParams
      | AesCbcParams
      | AesGcmParams,
    key: CryptoKey,
    data: BufferSource,
  ): Promise<ArrayBuffer>,
  exportKey(format: 'jwk', key: CryptoKey): Promise<JsonWebKey>,
  exportKey(format: KeyFormatWithoutJwk, key: CryptoKey): Promise<ArrayBuffer>,
  generateKey(
    algorithm:
      | AlgorithmIdentifier
      | RsaHashedKeyGenParams
      | AesKeyGenParams
      | HmacKeyGenParams
      | Pbkdf2Params,
    extractable: boolean,
    keyUsages: $ReadOnlyArray<KeyUsage>,
  ): Promise<CryptoKey>,
  importKey(
    format: 'jwk',
    keyData: JsonWebKey,
    algorithm:
      | AlgorithmIdentifier
      | RsaHashedImportParams
      | EcKeyImportParams
      | HmacImportParams
      | AesKeyAlgorithm,
    extractable: boolean,
    keyUsages: $ReadOnlyArray<KeyUsage>,
  ): Promise<CryptoKey>,
  importKey(
    format: KeyFormatWithoutJwk,
    keyData: BufferSource,
    algorithm:
      | AlgorithmIdentifier
      | RsaHashedImportParams
      | EcKeyImportParams
      | HmacImportParams
      | AesKeyAlgorithm,
    extractable: boolean,
    keyUsages: $ReadOnlyArray<KeyUsage>,
  ): Promise<CryptoKey>,
  sign(
    algorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams,
    key: CryptoKey,
    data: BufferSource,
  ): Promise<ArrayBuffer>,
  unwrapKey(
    format: KeyFormat,
    wrappedKey: BufferSource,
    unwrappingKey: CryptoKey,
    unwrapAlgorithm:
      | AlgorithmIdentifier
      | RsaOaepParams
      | AesCtrParams
      | AesCbcParams
      | AesGcmParams,
    unwrappedKeyAlgorithm:
      | AlgorithmIdentifier
      | RsaHashedImportParams
      | EcKeyImportParams
      | HmacImportParams
      | AesKeyAlgorithm,
    extractable: boolean,
    keyUsages: $ReadOnlyArray<KeyUsage>,
  ): Promise<CryptoKey>,
  verify(
    algorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams,
    key: CryptoKey,
    signature: BufferSource,
    data: BufferSource,
  ): Promise<boolean>,
  wrapKey(
    format: KeyFormat,
    key: CryptoKey,
    wrappingKey: CryptoKey,
    wrapAlgorithm:
      | AlgorithmIdentifier
      | RsaOaepParams
      | AesCtrParams
      | AesCbcParams
      | AesGcmParams,
  ): Promise<ArrayBuffer>,
};

export type Crypto = {
  +subtle: SubtleCrypto,
  getRandomValues<NumArray: $TypedArray>(typedArray: NumArray): NumArray,
  randomUUID(): string,
};

type KeyAlgorithm = {
  +name: string,
};

type KeyType = 'private' | 'public' | 'secret';

type KeyUsage =
  | 'decrypt'
  | 'deriveBits'
  | 'deriveKey'
  | 'encrypt'
  | 'sign'
  | 'unwrapKey'
  | 'verify'
  | 'wrapKey';

export type CryptoKey = {
  +algorithm: KeyAlgorithm,
  +extractable: boolean,
  +type: KeyType,
  +usages: $ReadOnlyArray<KeyUsage>,
};
