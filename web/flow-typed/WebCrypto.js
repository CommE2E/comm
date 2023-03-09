// @flow

// This code was copied from https://github.com/facebook/flow/pull/7714/files
// and slightly modified to get rid of TODO types that broke flow checks.

// This is a helper type to simplify the specification, it isn't an interface
// and there are no objects implementing it.
// https://developer.mozilla.org/en-US/docs/Web/API/BufferSource
type BufferSource = ArrayBuffer | $ArrayBufferView;

type DOMString = string;

declare interface Crypto extends RandomSource {
  +subtle: SubtleCrypto;
}

type CryptoKey$Type =
| 'secret'
| 'public'
| 'private';
type CryptoKey$Usages =
| 'encrypt'
| 'decrypt'
| 'sign'
| 'verify'
| 'deriveKey'
| 'deriveBits'
| 'wrapKey'
| 'unwrapKey';
declare interface CryptoKey {
  +algorithm: Object;
  +extractable: boolean;
  +type: CryptoKey$Type;
  +usages: CryptoKey$Usages[];
}

declare interface RandomSource {
  getRandomValues<T: $TypedArray>(typedArray: T): T;
};

type SubtleCrypto$Algorithm =
| {name: 'AES-CBC', iv: BufferSource}
| {name: 'AES-CTR', counter: BufferSource, length: number}
| {name: 'AES-GCM', iv: BufferSource, additionalData?: BufferSource, tagLength?: number}
| {name: 'RSA-OAEP', label?: string};
type SubtleCrypto$DerivedKeyAlgorithm = {
  name: DOMString,
  length?: 128 | 192 | 256,
};
type SubtleCrypto$AesKeyGenParams = {
  name: 'AES-CBC' | 'AES-CTR' | 'AES-GCM' | 'AES-KW',
  length: 128 | 192 | 256,
};
// TODO: fix types for parameters
type SubtleCrypto$DeriveKeyAlgorithm =
| {name: 'ECDH', public: any}
| {name: 'DH', public: any}
| {name: 'PBKDF2', salt: BufferSource, iterations: number, hash: DOMString}
| {name: 'HKDF-CTR', hash: any, label: any, context: any};
type SubtleCrypto$GenerateKeyAlgo =
| 'AES-CBC'
| 'AES-CTR'
| 'AES-GCM'
| 'RSA-OAEP'
| 'AES-KW'
| 'HMAC'
| 'RSASSA-PKCS1-v1_5'
| 'ECDSA'
| 'ECDH'
| 'DH';
type SubtleCrypto$HashAlgo =
| 'SHA-1'
| 'SHA-256'
| 'SHA-384'
| 'SHA-512';
type SubtleCrypto$KeyFormat =
| 'raw'
| 'pkcs8'
| 'spki'
| 'jwk';
type SubtleCrypto$SignAlgo =
| 'HMAC'
| 'RSASSA-PKCS1-v1_5'
| 'ECDSA';
type SubtleCrypto$WrapAlgo =
| 'AES-CBC'
| 'AES-CTR'
| 'AES-GCM'
| 'RSA-OAEP'
| 'AES-KW';
declare interface SubtleCrypto {
  decrypt(algorithm: SubtleCrypto$Algorithm, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
  // TODO: fix type for 'algorithm' param
  deriveBits(algorithm: any, baseKey: CryptoKey, length: number): Promise<ArrayBuffer>;
  deriveKey(algorithm: SubtleCrypto$DeriveKeyAlgorithm, masterKey: CryptoKey, derivedKeyAlgorithm: DOMString | SubtleCrypto$DerivedKeyAlgorithm, extractable: boolean, keyUsages: CryptoKey$Usages[]): Promise<CryptoKey>;
  digest(algo: SubtleCrypto$HashAlgo, buffer: BufferSource): Promise<ArrayBuffer>;
  encrypt(algorithm: SubtleCrypto$Algorithm, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
  exportKey(format: SubtleCrypto$KeyFormat, key: CryptoKey): Promise<ArrayBuffer>;
  generateKey(algo: SubtleCrypto$AesKeyGenParams, extractable: boolean, keyUsages: CryptoKey$Usages[]): Promise<CryptoKey>;
  importKey(format: SubtleCrypto$KeyFormat, keyData: ArrayBuffer | $TypedArray, algo: SubtleCrypto$GenerateKeyAlgo, extractable: boolean, usages: CryptoKey$Usages[]): Promise<CryptoKey>;
  sign(algo: SubtleCrypto$SignAlgo, key: CryptoKey, text2sign: BufferSource): Promise<ArrayBuffer>;
  unwrapKey(format: SubtleCrypto$KeyFormat, wrappedKey: ArrayBuffer, unwrappingKey: CryptoKey, unwrapAlgo: SubtleCrypto$WrapAlgo, unwrappedKeyAlgo: SubtleCrypto$WrapAlgo, extractable: boolean, keyUsages: CryptoKey$Usages[]): Promise<CryptoKey>;
  verify(algo: SubtleCrypto$SignAlgo, key: CryptoKey, signature: BufferSource, text2verify: BufferSource): Promise<boolean>;
  wrapKey(format: SubtleCrypto$KeyFormat, key: CryptoKey, wrappingKey: CryptoKey, wrapAlgo: SubtleCrypto$WrapAlgo): Promise<ArrayBuffer>;
}

declare var crypto: Crypto;
declare var msCrypto: Crypto;
declare var webkitCrypto: Crypto;
