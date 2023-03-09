// @flow

const KEY_SIZE = 32; // bytes
const IV_LENGTH = 12; // bytes - unique Initialization Vector (nonce)
const TAG_LENGTH = 16; // bytes - GCM auth tag

async function generateKey(): Promise<Uint8Array> {
  const algorithm = { name: 'AES-GCM', length: 256 };
  const key = await crypto.subtle.generateKey(algorithm, true, [
    'encrypt',
    'decrypt',
  ]);
  const keyData = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(keyData);
}

async function encrypt(
  keyBytes: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  if (keyBytes.length !== KEY_SIZE) {
    throw new Error('Invalid AES key size');
  }

  // we're creating the buffer now so we can avoid reallocating it later
  const outputBuffer = new ArrayBuffer(
    plaintext.length + IV_LENGTH + TAG_LENGTH,
  );
  const ivBytes = new Uint8Array(outputBuffer, 0, IV_LENGTH);
  const iv = crypto.getRandomValues(ivBytes);

  const algorithm = { name: 'AES-GCM', iv: iv, tagLength: TAG_LENGTH * 8 };
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
    'encrypt',
  ]);
  const ciphertextWithTag = await crypto.subtle.encrypt(
    algorithm,
    key,
    plaintext,
  );

  const result = new Uint8Array(outputBuffer);
  result.set(new Uint8Array(ciphertextWithTag), iv.length);
  return result;
}

async function decrypt(
  keyBytes: Uint8Array,
  sealedData: Uint8Array,
): Promise<Uint8Array> {
  if (keyBytes.length !== KEY_SIZE) {
    throw new Error('Invalid AES key size');
  }
  if (sealedData.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid ciphertext size');
  }

  const iv = sealedData.subarray(0, IV_LENGTH);
  const ciphertextWithTag = sealedData.subarray(IV_LENGTH);

  const algorithm = { name: 'AES-GCM', iv, tagLength: TAG_LENGTH * 8 };
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
    'decrypt',
  ]);

  const plaintextBuffer = await crypto.subtle.decrypt(
    algorithm,
    key,
    ciphertextWithTag,
  );
  return new Uint8Array(plaintextBuffer);
}

export { generateKey, encrypt, decrypt };
