// @flow

import { convertBytesToObj, convertObjToBytes } from './conversion-utils.js';

describe('convertObjToBytes and convertBytesToObj', () => {
  it('should convert object to byte array and back', () => {
    const obj = { hello: 'world', foo: 'bar', a: 2, b: false };

    const bytes = convertObjToBytes(obj);
    const restored = convertBytesToObj<typeof obj>(bytes);

    expect(restored).toStrictEqual(obj);
  });
});
