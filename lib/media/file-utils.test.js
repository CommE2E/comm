// @flow

import { filenameWithoutExtension } from './file-utils.js';

describe('filenameWithoutExtension', () => {
  it('removes extension from filename', () => {
    expect(filenameWithoutExtension('foo.jpg')).toBe('foo');
  });

  it('removes only last extension part from filename', () => {
    expect(filenameWithoutExtension('foo.bar.jpg')).toBe('foo.bar');
  });

  it('returns filename if it has no extension', () => {
    expect(filenameWithoutExtension('foo')).toBe('foo');
  });
});
