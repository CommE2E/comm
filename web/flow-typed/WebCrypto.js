// @flow

declare interface RandomSource {
  getRandomValues<T: $TypedArray>(typedArray: T): T;
  randomUUID(): string;
}

declare interface Crypto extends RandomSource {
  +subtle: SubtleCrypto;
}

type CryptoKey$Type = 'secret' | 'public' | 'private';
type CryptoKey$Usages =
  | 'encrypt'
  | 'decrypt'
  | 'sign'
  | 'verify'
  | 'deriveKey'
  | 'deriveBits'
  | 'wrapKey'
  | 'unwrapKey';

declare type CryptoKey = {
  +algorithm:
    | SubtleCrypto$AesKeyGenParams
    | SubtleCrypto$RsaHashedKeyGenParams
    | SubtleCrypto$EcKeyGenParams
    | SubtleCrypto$HmacKeyGenParams,
  +extractable: boolean,
  +type: CryptoKey$Type,
  +usages: $ReadOnlyArray<CryptoKey$Usages>,
};

type SubtleCrypto$KeyFormatWithoutJwk = 'pkcs8' | 'raw' | 'spki';
type SubtleCrypto$KeyFormat = 'jwk' | SubtleCrypto$KeyFormatWithoutJwk;
type SubtleCrypto$HashAlgo = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
type SubtleCrypto$AesAlgo = 'AES-CBC' | 'AES-CTR' | 'AES-GCM' | 'AES-KW';

type SubtleCrypto$RsaOaepParams = {
  +name: 'RSA-OAEP',
  +label?: BufferSource,
};

type SubtleCrypto$AesCtrParams = {
  +name: 'AES-CTR',
  +counter: BufferSource,
  +length: number,
};

type SubtleCrypto$AesCbcParams = {
  +name: 'AES-CBC',
  +iv: BufferSource,
};

type SubtleCrypto$AesGcmParams = {
  +name: 'AES-GCM',
  +iv: BufferSource,
  +additionalData?: BufferSource,
  +tagLength?: number,
};

type SubtleCrypto$EcdhKeyDeriveParams = {
  +name: 'ECDH',
  +public: CryptoKey,
};

type SubtleCrypto$HkdfParams = {
  +name: 'HKDF',
  +hash: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512',
  +info: BufferSource,
  +salt: BufferSource,
};

type SubtleCrypto$Pbkdf2Params = {
  +name: 'PBKDF2',
  +hash: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512',
  +iterations: number,
  +salt: BufferSource,
};

type SubtleCrypto$HmacImportParams = {
  +name: 'HMAC',
  +hash: 'SHA-256' | 'SHA-384' | 'SHA-512',
  +length?: number,
};

type SubtleCrypto$RsaHashedKeyGenParams = {
  +name: 'RSASSA-PKCS1-v1_5' | 'RSA-PSS' | 'RSA-OAEP',
  +modulusLength: number,
  +publicExponent: Uint8Array,
  +hash: 'SHA-256' | 'SHA-384' | 'SHA-512',
};

type SubtleCrypto$HmacKeyGenParams = {
  +name: 'HMAC',
  +hash: SubtleCrypto$HashAlgo,
  +length?: number,
};

type SubtleCrypto$RsaHashedImportParams = {
  +name: 'RSASSA-PKCS1-v1_5' | 'RSA-PSS' | 'RSA-OAEP',
  +hash: 'SHA-256' | 'SHA-384' | 'SHA-512',
};

type SubtleCrypto$EcKeyImportParams = {
  +name: 'ECDSA' | 'ECDH',
  +namedCurve: 'P-256' | 'P-384' | 'P-521',
};

type SubtleCrypto$EcKeyGenParams = {
  +name: 'ECDSA' | 'ECDH',
  +namedCurve: 'P-256' | 'P-384' | 'P-521',
};

type SubtleCrypto$RsaPssParams = {
  +name: 'RSA-PSS',
  +saltLength: number,
};

type SubtleCrypto$EcdsaParams = {
  +name: 'ECDSA',
  +hash: 'SHA-256' | 'SHA-384' | 'SHA-512',
};

type SubtleCrypto$AesKeyGenParams = {
  +name: 'AES-CBC' | 'AES-CTR' | 'AES-GCM' | 'AES-KW',
  +length: 128 | 192 | 256,
};

type SubtleCrypto$ImportKeyAlgo =
  | SubtleCrypto$RsaHashedImportParams
  | SubtleCrypto$EcKeyImportParams
  | SubtleCrypto$HmacImportParams
  | SubtleCrypto$AesAlgo
  | 'PBKDF2'
  | 'HKDF';

type SubtleCrypto$RsaOtherPrimesInfo = {
  +d?: string,
  +r?: string,
  +t?: string,
};

type SubtleCrypto$JsonWebKey = {
  +alg?: string,
  +crv?: string,
  +d?: string,
  +dp?: string,
  +dq?: string,
  +e?: string,
  +ext?: boolean,
  +k?: string,
  +key_ops?: $ReadOnlyArray<string>,
  +kty?: string,
  +n?: string,
  +oth?: $ReadOnlyArray<SubtleCrypto$RsaOtherPrimesInfo>,
  +p?: string,
  +q?: string,
  +qi?: string,
  +use?: string,
  +x?: string,
  +y?: string,
};

declare interface SubtleCrypto {
  decrypt(
    algorithm:
      | SubtleCrypto$RsaOaepParams
      | SubtleCrypto$AesCtrParams
      | SubtleCrypto$AesCbcParams
      | SubtleCrypto$AesGcmParams,
    key: CryptoKey,
    data: BufferSource,
  ): Promise<ArrayBuffer>;
  deriveBits(
    algorithm:
      | SubtleCrypto$EcdhKeyDeriveParams
      | SubtleCrypto$HkdfParams
      | SubtleCrypto$Pbkdf2Params,
    baseKey: CryptoKey,
    length: number,
  ): Promise<ArrayBuffer>;
  deriveKey(
    algorithm:
      | SubtleCrypto$EcdhKeyDeriveParams
      | SubtleCrypto$HkdfParams
      | SubtleCrypto$Pbkdf2Params,
    baseKey: CryptoKey,
    derivedKeyType:
      | SubtleCrypto$HmacKeyGenParams
      | SubtleCrypto$AesKeyGenParams,
    extractable: boolean,
    keyUsages: $ReadOnlyArray<CryptoKey$Usages>,
  ): Promise<CryptoKey>;
  digest(
    algorithm: SubtleCrypto$HashAlgo | { +name: SubtleCrypto$HashAlgo },
    data: BufferSource,
  ): Promise<ArrayBuffer>;
  encrypt(
    algorithm:
      | SubtleCrypto$RsaOaepParams
      | SubtleCrypto$AesCtrParams
      | SubtleCrypto$AesCbcParams
      | SubtleCrypto$AesGcmParams,
    key: CryptoKey,
    data: BufferSource,
  ): Promise<ArrayBuffer>;
  exportKey(format: 'jwk', key: CryptoKey): Promise<SubtleCrypto$JsonWebKey>;
  exportKey(
    format: SubtleCrypto$KeyFormatWithoutJwk,
    key: CryptoKey,
  ): Promise<ArrayBuffer>;
  generateKey(
    algorithm:
      | SubtleCrypto$RsaHashedKeyGenParams
      | SubtleCrypto$EcKeyGenParams
      | SubtleCrypto$HmacKeyGenParams
      | SubtleCrypto$AesKeyGenParams,
    extractable: boolean,
    keyUsages: $ReadOnlyArray<CryptoKey$Usages>,
  ): Promise<CryptoKey>;
  importKey(
    format: SubtleCrypto$KeyFormatWithoutJwk,
    keyData: BufferSource,
    algorithm: SubtleCrypto$ImportKeyAlgo,
    extractable: boolean,
    keyUsages: $ReadOnlyArray<CryptoKey$Usages>,
  ): Promise<CryptoKey>;
  importKey(
    format: 'jwk',
    keyData: SubtleCrypto$JsonWebKey,
    algorithm: SubtleCrypto$ImportKeyAlgo,
    extractable: boolean,
    keyUsages: $ReadOnlyArray<CryptoKey$Usages>,
  ): Promise<CryptoKey>;

  sign(
    algorithm:
      | 'RSASSA-PKCS1-v1_5'
      | 'HMAC'
      | SubtleCrypto$RsaPssParams
      | SubtleCrypto$EcdsaParams,
    key: CryptoKey,
    data: BufferSource,
  ): Promise<ArrayBuffer>;
  unwrapKey(
    format: SubtleCrypto$KeyFormat,
    wrappedKey: ArrayBuffer,
    unwrappingKey: CryptoKey,
    unwrapAlgorithm:
      | SubtleCrypto$RsaOaepParams
      | SubtleCrypto$AesCtrParams
      | SubtleCrypto$AesCbcParams
      | SubtleCrypto$AesGcmParams
      | 'AES-KW',
    unwrappedKeyAlgorithm: SubtleCrypto$ImportKeyAlgo,
    extractable: boolean,
    keyUsages: $ReadOnlyArray<CryptoKey$Usages>,
  ): Promise<CryptoKey>;
  verify(
    algorithm:
      | SubtleCrypto$RsaPssParams
      | SubtleCrypto$EcdsaParams
      | 'RSASSA-PKCS1-v1_5'
      | 'HMAC',
    key: CryptoKey,
    signature: ArrayBuffer,
    data: ArrayBuffer,
  ): Promise<boolean>;
  wrapKey(
    format: SubtleCrypto$KeyFormat,
    key: CryptoKey,
    wrappingKey: CryptoKey,
    wrapAlgorithm:
      | SubtleCrypto$RsaOaepParams
      | SubtleCrypto$AesCtrParams
      | SubtleCrypto$AesCbcParams
      | SubtleCrypto$AesGcmParams
      | 'AES-KW',
  ): Promise<ArrayBuffer>;
}

declare var crypto: Crypto;
declare var msCrypto: Crypto;
declare var webkitCrypto: Crypto;
