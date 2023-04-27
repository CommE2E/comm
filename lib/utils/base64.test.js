// @flow

import { toBase64Url } from './base64.js';

describe('toBase64Url', () => {
  it('converts base64 to base64url', () => {
    expect(toBase64Url('aGVsbG8gd29ybGQ=')).toStrictEqual('aGVsbG8gd29ybGQ');
    expect(
      toBase64Url('qL8R4QIcQ/ZsRqOAbeRfcZhilN/MksRtDaErMA=='),
    ).toStrictEqual('qL8R4QIcQ_ZsRqOAbeRfcZhilN_MksRtDaErMA');
  });

  it('does not strip padding if stripPadding is false', () => {
    expect(toBase64Url('aGVsbG8gd29ybGQ=', false)).toStrictEqual(
      'aGVsbG8gd29ybGQ=',
    );
  });
});
