// @flow

import type { PaddingConfiguration } from './pkcs7-padding';
import { pad, unpad, testing } from './pkcs7-padding.js';

describe('PKCS#7 Padding', () => {
  it('should pad data to a multiple of blockSize bytes', () => {
    const blockSize = 16;
    const data = generateRandomData(100);
    const expectedPadding = 16 - (data.length % blockSize);

    const padded = testing.pkcs7pad(data, blockSize);
    expect(padded.length % 16).toBe(0);
    expect(padded[padded.length - 1]).toBe(expectedPadding);
  });

  it('pkcs7pad should add a full block if input is multiple of blockSize bytes', () => {
    const blockSize = 16;
    const data = generateRandomData(16);
    const expectedPadding = 16;

    const padded = testing.pkcs7pad(data, blockSize);
    expect(padded.length % 16).toBe(0);
    expect(padded[padded.length - 1]).toBe(expectedPadding);
  });

  it('pkcs7pad should fail if blockSize is out of 1-255 range', () => {
    const data = generateRandomData(16);
    expect(() => testing.pkcs7pad(data, 0)).toThrow();
    expect(() => testing.pkcs7pad(data, 256)).toThrow();
  });

  it('pkcs7unpad should unpad data', () => {
    // blockSize = 16
    const padded = new Uint8Array([
      ...generateRandomArray(10),
      ...[6, 6, 6, 6, 6, 6],
    ]);

    const unpadded = testing.pkcs7unpad(padded);
    expect(unpadded.length).toBe(10);
  });

  it('pkcs7unpad should throw if the padding length is 0', () => {
    // blockSize = 16
    const padded = new Uint8Array([
      ...generateRandomArray(10),
      ...[0, 0, 0, 0, 0, 0],
    ]);
    expect(() => testing.pkcs7unpad(padded)).toThrow();
  });

  it('pkcs7unpad should throw if the padding length is > blockSize', () => {
    // blockSize = 16
    const padded = new Uint8Array([
      ...generateRandomArray(10),
      ...[17, 17, 17, 17, 17, 17],
    ]);
    expect(() => testing.pkcs7unpad(padded)).toThrow();
  });

  it('pkcs7unpad should throw if the padding is invalid', () => {
    // blockSize = 16
    const padded = new Uint8Array([
      ...generateRandomArray(10),
      ...[6, 1, 2, 3, 4, 6],
    ]);
    expect(() => testing.pkcs7unpad(padded)).toThrow();
  });

  it('pkcs7pad and pkcs7unpad should be inverses', () => {
    const blockSize = 16;
    const data = generateRandomData(100);
    const padded = testing.pkcs7pad(data, blockSize);
    const unpadded = testing.pkcs7unpad(padded);
    expect(unpadded.length).toBe(data.length);
    expect(unpadded).toEqual(data);
  });
});

describe('superblock padding', () => {
  it('should pad data to a multiple of superblockSize blocks', () => {
    const blockSizeBytes = 16;
    const superblockSizeBlocks = 4;
    const dataLengthBytes = 3 * 16;
    const expectedPaddedLength = 4 * 16;
    const expectedBlockPadding = 1;

    const data = generateRandomData(dataLengthBytes);
    const padded = testing.superblockPad(
      data,
      blockSizeBytes,
      superblockSizeBlocks,
    );

    expect(padded.length % expectedPaddedLength).toBe(0);
    expect(padded[padded.length - 1]).toBe(expectedBlockPadding);
  });

  it('pad should add a full superblock if input is a multiple of superblockSize blocks', () => {
    const blockSizeBytes = 16;
    const superblockSizeBlocks = 4;
    const dataLengthBytes = 4 * 16;
    const expectedPaddedLength = 8 * 16;
    const expectedBlockPadding = 4;

    const data = generateRandomData(dataLengthBytes);
    const padded = testing.superblockPad(
      data,
      blockSizeBytes,
      superblockSizeBlocks,
    );

    expect(padded.length % expectedPaddedLength).toBe(0);
    expect(padded[padded.length - 1]).toBe(expectedBlockPadding);
  });

  it('superblockUnpad should unpad data', () => {
    const blockSizeBytes = 16;

    // 2 blocks of data + 2 blocks of padding = 4 blocks total (1 superblock)
    const padded = new Uint8Array([
      ...generateRandomArray(2 * 16),
      ...new Array(2 * 16).fill(2),
    ]);

    const unpadded = testing.superblockUnpad(padded, blockSizeBytes);

    expect(unpadded.length).toBe(32);
    expect(unpadded).toEqual(padded.subarray(0, 32));
  });

  it('superblockUnpad should throw if the padding length is 0', () => {
    const blockSizeBytes = 16;
    const padded = new Uint8Array([
      ...generateRandomArray(2 * 16),
      ...new Array(2 * 16).fill(0),
    ]);
    expect(() => testing.superblockUnpad(padded, blockSizeBytes)).toThrow();
  });

  it('superblockUnpad should throw if the padding length is > num blocks', () => {
    const blockSizeBytes = 16;
    // 4 blocks total, but filled with 5s
    const padded = new Uint8Array([
      ...generateRandomArray(2 * 16),
      ...new Array(2 * 16).fill(5),
    ]);
    expect(() => testing.superblockUnpad(padded, blockSizeBytes)).toThrow();
  });

  it('superblockUnpad should throw if the padding is invalid', () => {
    const blockSizeBytes = 16;
    const padded = new Uint8Array([
      ...generateRandomArray(2 * 16),
      ...generateRandomArray(2 * 15),
      ...[1],
    ]);
    expect(() => testing.superblockUnpad(padded, blockSizeBytes)).toThrow();
  });
});

describe('padding integration tests (pad and unpad)', () => {
  it('should pad data to a multiple of superblockSize blocks', () => {
    const config: PaddingConfiguration = {
      blockSizeBytes: 16,
      superblockSizeBlocks: 4,
    };

    // 20 bytes of data - expected 4 blocks total (1 superblock):
    // - block 1 (16 bytes) = 16 bytes of data
    // - block 2 (16 bytes) = 4 bytes of data (remaining 12 bytes of padding)
    // - block 3 (16 bytes) = full padding (filled with 2s)
    // - block 4 (16 bytes) = full padding (filled with 2s)
    const dataLengthBytes = 20;
    const expectedPkcs7Padding = 12;
    const expectedBlockPadding = 2;
    const expectedPaddedLength = 4 * 16;

    const data = generateRandomData(dataLengthBytes);
    const padded = pad(data, config);

    expect(padded.length % expectedPaddedLength).toBe(0);
    expect(padded[padded.length - 1]).toBe(expectedBlockPadding);
    expect(padded[2 * 16 - 1]).toBe(expectedPkcs7Padding);
  });

  it('pad should add a full superblock if pkcs7-padded input is a multiple of superblockSize blocks', () => {
    const config: PaddingConfiguration = {
      blockSizeBytes: 16,
      superblockSizeBlocks: 4,
    };

    // 5 bytes less so pkcs7 padding is 5 bytes and pads equally to superblock
    // size
    const pkcs7paddingLength = 5;
    const dataLengthBytes = 4 * 16 - pkcs7paddingLength;

    const expectedPaddedLength = 8 * 16;
    const expectedBlockPadding = 4;

    const data = generateRandomData(dataLengthBytes);
    const padded = pad(data, config);

    expect(padded.length % expectedPaddedLength).toBe(0);
    expect(padded[padded.length - 1]).toBe(expectedBlockPadding);
  });

  it('pad and unpad should be inverses', () => {
    const config: PaddingConfiguration = {
      blockSizeBytes: 16,
      superblockSizeBlocks: 4,
    };

    const data = generateRandomData(100);
    const padded = pad(data, config);
    const unpadded = unpad(padded, config);
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
