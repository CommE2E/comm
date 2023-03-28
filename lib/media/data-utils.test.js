// @flow
import {
  uintArrayToHexString,
  hexToUintArray,
  uintArrayToDataURL,
} from './data-utils.js';

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

describe('uintArrayToDataURL', () => {
  it('converts JPEG Uint8Array to data URL', () => {
    const jpegMagicBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const jpegData = new Uint8Array(jpegMagicBytes.length + 10);
    jpegData.set(jpegMagicBytes);
    jpegData.set(
      new Uint8Array([0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
      jpegMagicBytes.length,
    );

    const jpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAAA=';
    expect(uintArrayToDataURL(jpegData)).toStrictEqual(jpegBase64);
  });

  it('returns null if MIME type cannot be determined', () => {
    const data = new Uint8Array([0x00, 0x01, 0x02, 0x1a, 0x2b, 0xff]);
    expect(uintArrayToDataURL(data)).toBeNull();
  });
});
