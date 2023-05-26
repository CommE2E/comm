// @flow
import { uintArrayToHexString, hexToUintArray } from './data-utils.js';

describe('uintArrayToHexString', () => {
  it('converts Uint8Array to hex string', () => {
    const data = new Uint8Array([0x00, 0x01, 0x02, 0x1a, 0x2b, 0xff]);
    expect(uintArrayToHexString(data)).toStrictEqual('0001021a2bff');
  });
});

describe('hexToUintArray', () => {
  it('converts hex string to Uint8Array', () => {
    const hex = '0001021a2bff';
    expect(hexToUintArray(hex)).toStrictEqual(
      new Uint8Array([0x00, 0x01, 0x02, 0x1a, 0x2b, 0xff]),
    );
  });
});
