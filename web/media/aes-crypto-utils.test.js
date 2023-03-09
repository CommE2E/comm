// @flow

import { generateKey, encrypt, decrypt } from './aes-crypto-utils.js';

// some mock data
const testPlaintext = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
const testEncryptionKey = new Uint8Array([
  3, 183, 109, 170, 201, 127, 55, 253, 114, 23, 75, 24, 168, 44, 150, 92, 148,
  60, 26, 126, 45, 237, 92, 10, 63, 89, 226, 77, 109, 29, 238, 143,
]);
const testSealedData = new Uint8Array([
  172, 195, 202, 136, 163, 60, 134, 85, 41, 48, 44, 27, 181, 109, 35, 254, 150,
  78, 255, 5, 8, 28, 4, 208, 206, 117, 148, 66, 196, 247, 61, 11, 3, 118, 116,
  5, 112, 185, 142,
]);

const randomData = new Uint8Array(
  new Array(100).fill(0).map(() => Math.floor(Math.random() * 255)),
);

describe('generateKey', () => {
  it('generates 32-byte AES key', async () => {
    const key = await generateKey();
    expect(key.length).toBe(32);
  });
});

describe('encrypt', () => {
  it('generates ciphertext with IV and tag included', async () => {
    const encrypted = await encrypt(testEncryptionKey, testPlaintext);
    // IV and tag are randomly generated, so we can't check the exact value
    // IV + plaintext + tag = 12 + 11 + 16 = 39
    expect(encrypted.length).toBe(testPlaintext.length + 12 + 16);
  });

  it('is decryptable by decrypt()', async () => {
    const key = await generateKey();
    const encrypted = await encrypt(key, randomData);
    const decrypted = await decrypt(key, encrypted);
    expect(decrypted).toEqual(randomData);
  });
});

describe('decrypt', () => {
  it('decrypts ciphertext', async () => {
    const decrypted = await decrypt(testEncryptionKey, testSealedData);
    expect(decrypted).toEqual(testPlaintext);
  });

  it('fails with wrong key', async () => {
    const key = await generateKey();
    const encrypted = await encrypt(key, randomData);

    const wrongKey = await generateKey();
    await expect(decrypt(wrongKey, encrypted)).rejects.toThrow();
  });

  it('fails with wrong ciphertext', async () => {
    const key = await generateKey();
    const encrypted = await encrypt(key, randomData);

    // change the first byte of the ciphertext (it's 13th byte in the buffer)
    // first 12 bytes are IV, so changing the first byte of the ciphertext
    encrypted[12] = encrypted[12] ^ 1;

    await expect(decrypt(key, encrypted)).rejects.toThrow();
  });

  it('fails with wrong IV', async () => {
    const key = await generateKey();
    const encrypted = await encrypt(key, randomData);

    // change the first byte of the IV (it's 1st byte in the buffer)
    encrypted[0] = encrypted[0] ^ 1;

    await expect(decrypt(key, encrypted)).rejects.toThrow();
  });

  it('fails with wrong tag', async () => {
    const key = await generateKey();
    const encrypted = await encrypt(key, randomData);

    // change the last byte of the tag (tag is the last 16 bytes of the buffer)
    encrypted[encrypted.length - 1] = encrypted[encrypted.length - 1] ^ 1;

    await expect(decrypt(key, encrypted)).rejects.toThrow();
  });
});
