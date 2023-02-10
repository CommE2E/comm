// @flow

import { leastPositiveResidue } from './math-utils.js';

describe('leastPositiveResidue', () => {
  it('x should be equal to 2 for x ≡ 8 (mod 3)', () => {
    expect(leastPositiveResidue(8, 3)).toEqual(2);
  });

  it('x should be equal to 5 for x ≡ 19 (mod 7)', () => {
    expect(leastPositiveResidue(19, 7)).toEqual(5);
  });

  it('x should be equal to 7 for x ≡ -3 (mod 11)', () => {
    expect(leastPositiveResidue(-3, 10)).toEqual(7);
  });

  it('function should throw error', () => {
    expect(() => leastPositiveResidue(5, -1)).toThrow(
      'modulus must be greater than 0, but was -1',
    );
  });
});
