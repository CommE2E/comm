// @flow

import { generateRandomString } from './text-utils.js';

describe('generateRandomString', () => {
  it('should return an empty string when passed length = 0', () => {
    expect(generateRandomString(0, 'abcde')).toMatch(/^$/);
    expect(generateRandomString(0, '')).toMatch(/^$/);
  });

  it(
    'should return a random string of length equal to length argument, ' +
      'containig only characters given in availableSigns',
    () => {
      const length1 = 100;
      const availableSigns1 = 'abcde';
      expect(generateRandomString(length1, availableSigns1)).toMatch(
        new RegExp(`^[${availableSigns1}]{${length1.toString()}}$`),
      );

      const length2 = 10;
      const availableSigns2 = 'abcde0123456789!@#$%^&*';
      expect(generateRandomString(length2, availableSigns2)).toMatch(
        new RegExp(`^[${availableSigns2}]{${length2.toString()}}$`),
      );

      const length3 = 10;
      const availableSigns3 = 'a';
      expect(generateRandomString(length3, availableSigns3)).toMatch(
        new RegExp(`^[${availableSigns3}]{${length3.toString()}}$`),
      );
    },
  );

  it('should throw an error when length is negative', () => {
    expect(() => generateRandomString(-1, 'abc')).toThrow();
    expect(() => generateRandomString(-1, '')).toThrow();
    expect(() => generateRandomString(-123, 'abc')).toThrow();
    expect(() => generateRandomString(-123, '')).toThrow();
  });

  it(
    'should throw an error when availableSigns is an empty string, ' +
      'and length is positive',
    () => {
      expect(() => generateRandomString(1, '')).toThrow();
      expect(() => generateRandomString(10, '')).toThrow();
    },
  );

  it('should throw an error when availableSigns length exceeds 256', () => {
    const longString = 'a'.repeat(257);
    expect(() => generateRandomString(1, longString)).toThrow();
  });
});
