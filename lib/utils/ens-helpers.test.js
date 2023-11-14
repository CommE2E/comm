// @flow

import { isValidENSName } from './ens-helpers.js';

describe('it should correctly validate ENS names', () => {
  it('should match all valid typical ENS names', () => {
    expect(isValidENSName('foo.eth')).toBe(true);
    expect(isValidENSName('jack.eth')).toBe(true);
    expect(isValidENSName('thisuserhasareallylongname.eth')).toBe(true);
    expect(isValidENSName('hello-world.eth')).toBe(true);
  });

  it('should match all valid ENS names with numbers', () => {
    expect(isValidENSName('foo123.eth')).toBe(true);
    expect(isValidENSName('123foo.eth')).toBe(true);
    expect(isValidENSName('123foo123.eth')).toBe(true);
  });

  it('should match all valid ENS names with unicode characters', () => {
    expect(isValidENSName('föǒ.eth')).toBe(true);
    expect(isValidENSName('hëļļø.eth')).toBe(true);
  });

  it('should match one-character emoji SLDs that are made up of 3 characters', () => {
    expect(isValidENSName('💂‍♂️.eth')).toBe(true);
    expect(isValidENSName('🕵️‍♂️.eth')).toBe(true);
    expect(isValidENSName('👨‍🚀.eth')).toBe(true);
  });

  it('should not match one-character emoji SLDs that are made up of less than 3 characters', () => {
    expect(isValidENSName('🏀.eth')).toBe(false);
    expect(isValidENSName('🎃.eth')).toBe(false);
  });

  it('should not match any SLDs less than 3 characters', () => {
    expect(isValidENSName('fo.eth')).toBe(false);
    expect(isValidENSName('f.eth')).toBe(false);
    expect(isValidENSName('')).toBe(false);
    expect(isValidENSName('a.eth')).toBe(false);
    expect(isValidENSName('ö.eth')).toBe(false);
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
