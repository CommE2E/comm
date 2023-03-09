// @flow

import { generateKey, encrypt, decrypt } from './aes-crypto.js';

// some mock data
const testPlaintext = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
const testEncryptionKey = new Uint8Array([
  3, 183, 109, 170, 201, 127, 55, 253, 114, 23, 75, 24, 168, 44, 150, 92, 148,
  60, 26, 126, 45, 237, 92, 10, 63, 89, 226, 77, 109, 29, 238, 143,
]);
const testCiphertext = new Uint8Array([
  172, 195, 202, 136, 163, 60, 134, 85, 41, 48, 44, 27, 181, 109, 35, 254, 150,
  78, 255, 5, 8, 28, 4, 208, 206, 117, 148, 66, 196, 247, 61, 11, 3, 118, 116,
  5, 112, 185, 142,
]);

const randomData = new Uint8Array(
  new Array(100).fill(0).map(() => Math.floor(Math.random() * 255)),
);

describe('aes-crypto', () => {
  it('generateKey() generates 32-byte AES key', async () => {
    const key = await generateKey();
    expect(key.length).toBe(32);
  });

  it('encrypt() generates ciphertext with IV and tag included', async () => {
    const ciphertext = await encrypt(testEncryptionKey, testPlaintext);
    // IV and tag are randomly generated, so we can't check the exact value
    // IV + plaintext + tag = 12 + 11 + 16 = 39
    expect(ciphertext.length).toBe(testPlaintext.length + 12 + 16);
  });

  it('decrypt() decrypts ciphertext', async () => {
    const decrypted = await decrypt(testEncryptionKey, testCiphertext);
    expect(decrypted).toEqual(testPlaintext);
  });

  it('encrypt and decrypt work together', async () => {
    const key = await generateKey();
    const ciphertext = await encrypt(key, randomData);
    const decrypted = await decrypt(key, ciphertext);
    expect(decrypted).toEqual(randomData);
  });

  it('fails to decrypt with wrong key', async () => {
    const key = await generateKey();
    const ciphertext = await encrypt(key, randomData);

    const wrongKey = await generateKey();
    await expect(decrypt(wrongKey, ciphertext)).rejects.toThrow();
  });
});
