// @flow

import { sortUserIDs } from './relationship-utils.js';

describe('sortUserIDs', () => {
  it('should sort id that are numbers, as numbers', () => {
    expect(sortUserIDs('100', '99')).toEqual(['99', '100']);
  });
  it('should always sort uuid before id that is a number', () => {
    expect(sortUserIDs('100A', '99')).toEqual(['99', '100A']);
    expect(sortUserIDs('100', '99A')).toEqual(['100', '99A']);
  });
  it('should sort uuid lexicographically', () => {
    expect(sortUserIDs('100A', '99A')).toEqual(['100A', '99A']);
    expect(sortUserIDs('DEF', 'abc')).toEqual(['DEF', 'abc']);
  });
});
