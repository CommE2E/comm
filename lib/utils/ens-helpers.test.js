// @flow

import { isValidENSName } from './ens-helpers.js';

describe('it should correctly validate ENS names', () => {
  it('should match all valid ENS names', () => {
    expect(isValidENSName('foo.eth')).toBe(true);
    expect(isValidENSName('jack.eth')).toBe(true);
    expect(isValidENSName('thisuserhasareallylongname.eth')).toBe(true);
    expect(isValidENSName('hello-world.eth')).toBe(true);
  });

  it('should not match any SLDs less than 3 characters', () => {
    expect(isValidENSName('fo.eth')).toBe(false);
    expect(isValidENSName('f.eth')).toBe(false);
    expect(isValidENSName('')).toBe(false);
    expect(isValidENSName('a.eth')).toBe(false);
  });

  it('should not match any TLDs other than .eth', () => {
    expect(isValidENSName('foo.com')).toBe(false);
    expect(isValidENSName('foo.')).toBe(false);
    expect(isValidENSName('foo')).toBe(false);
  });

  it('should not match any names with special characters', () => {
    expect(isValidENSName('foo.eth!')).toBe(false);
    expect(isValidENSName('foo.eth#')).toBe(false);
    expect(isValidENSName('foo$.eth')).toBe(false);
  });
});
