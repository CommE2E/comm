// @flow

function leastPositiveResidue(dividend: number, modulus: number): number {
  // the smallest positive of x is integer k such that
  // x is congruent to k (mod n)
  // in our case we only consider n > 0
  if (modulus <= 0) {
    throw new Error(`modulus must be greater than 0, but was ${modulus}`);
  }
  return dividend - Math.floor(dividend / modulus) * modulus;
}

export { leastPositiveResidue };
