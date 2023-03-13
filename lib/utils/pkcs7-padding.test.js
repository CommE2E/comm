// @flow

import { pkcs7pad, pkcs7unpad } from './pkcs7-padding.js';

describe('PKCS#7 Padding', () => {
  it('should pad data to a multiple of blockSize bytes', () => {
    const blockSize = 16;
    const data = generateRandomData(100);
    const expectedPadding = 16 - (data.length % blockSize);

    const padded = pkcs7pad(data, blockSize);
    expect(padded.length % 16).toBe(0);
    expect(padded[padded.length - 1]).toBe(expectedPadding);
  });

  it('pkcs7pad should add a full block if input is multiple of blockSize bytes', () => {
    const blockSize = 16;
    const data = generateRandomData(16);
    const expectedPadding = 16;

    const padded = pkcs7pad(data, blockSize);
    expect(padded.length % 16).toBe(0);
    expect(padded[padded.length - 1]).toBe(expectedPadding);
  });

  it('pkcs7pad should fail if blockSize is out of 1-255 range', () => {
    const data = generateRandomData(16);
    expect(() => pkcs7pad(data, 0)).toThrow();
    expect(() => pkcs7pad(data, 256)).toThrow();
  });

  it('pkcs7unpad should unpad data', () => {
    // blockSize = 16
    const padded = new Uint8Array([
      ...generateRandomArray(10),
      ...[6, 6, 6, 6, 6, 6],
    ]);

    const unpadded = pkcs7unpad(padded);
    expect(unpadded.length).toBe(10);
  });

  it('pkcs7unpad should throw if the padding length is 0', () => {
    // blockSize = 16
    const padded = new Uint8Array([
      ...generateRandomArray(10),
      ...[0, 0, 0, 0, 0, 0],
    ]);
    expect(() => pkcs7unpad(padded)).toThrow();
  });

  it('pkcs7unpad should throw if the padding length is > blockSize', () => {
    // blockSize = 16
    const padded = new Uint8Array([
      ...generateRandomArray(10),
      ...[17, 17, 17, 17, 17, 17],
    ]);
    expect(() => pkcs7unpad(padded)).toThrow();
  });

  it('pkcs7unpad should throw if the padding is invalid', () => {
    // blockSize = 16
    const padded = new Uint8Array([
      ...generateRandomArray(10),
      ...[6, 1, 2, 3, 4, 6],
    ]);
    expect(() => pkcs7unpad(padded)).toThrow();
  });

  it('pkcs7pad and pkcs7unpad should be inverses', () => {
    const blockSize = 16;
    const data = generateRandomData(100);
    const padded = pkcs7pad(data, blockSize);
    const unpadded = pkcs7unpad(padded);
    expect(unpadded.length).toBe(data.length);
    expect(unpadded).toEqual(data);
  });
});

function generateRandomData(length: number): Uint8Array {
  const data = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  return data;
}

function generateRandomArray(length: number): Array<number> {
  return new Array(length).map(() => Math.floor(Math.random() * 256));
}
