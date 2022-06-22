// @flow

import { pluralize } from './text-utils.js';

describe('pluralize(nouns, maxNumberOfNouns)', () => {
  it('should return an empty string when no words are given', () => {
    expect(pluralize([])).toBe('');
  });

  it('should return a single word when a single word is given', () => {
    expect(pluralize(['a'])).toBe('a');
  });

  it('should return "X and Y" when two words are given', () => {
    expect(pluralize(['a', 'b'])).toBe('a and b');
  });

  it('should return "X, Y, and Z" when three words are given', () => {
    expect(pluralize(['a', 'b', 'c'])).toBe('a, b, and c');
  });

  it('should return "X, Y, and {N-2} others" when N (>=4) words are given', () => {
    expect(pluralize(['a', 'b', 'c', 'd'])).toBe('a, b, and 2 others');
    expect(pluralize(['a', 'b', 'c', 'd', 'e'])).toBe('a, b, and 3 others');
    expect(pluralize(['a', 'b', 'c', 'd', 'e', 'f'])).toBe(
      'a, b, and 4 others',
    );
  });

  it('should return "X, Y, and Z" when three words are given and maxNumNouns = 3', () => {
    expect(pluralize(['a', 'b', 'c'])).toBe('a, b, and c');
  });

  it('should return "X and 2 others" when three words are given and maxNumNouns = 2', () => {
    expect(pluralize(['cat', 'dog', 'sheep'], 2)).toBe('cat and 2 others');
  });

  it('should return "3 users" when three words are given and maxNumNouns = 1', () => {
    expect(pluralize(['cat', 'dog', 'sheep'], 1)).toBe('3 users');
  });

  it('should return an empty string when three words are given and maxNumNouns = 0', () => {
    expect(pluralize(['cat', 'dog', 'sheep'], 0)).toBe('');
  });

  it('should return "A, B, C, and D" when four words are given and maxNumNouns = 5', () => {
    expect(pluralize(['cat', 'dog', 'sheep', 'moose'], 5)).toBe(
      'cat, dog, sheep, and moose',
    );
  });
});
