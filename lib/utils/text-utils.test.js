// @flow

import { pluralize, trimText } from './text-utils.js';

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

describe('trimText(text, maxLength)', () => {
  it('should return the original text when the text is shorter than maxLength', () => {
    expect(trimText('a', 2)).toBe('a');
    expect(trimText('a', 3)).toBe('a');
    expect(trimText('a', 4)).toBe('a');

    expect(trimText('ab', 3)).toBe('ab');
    expect(trimText('ab', 4)).toBe('ab');

    expect(trimText('abc', 4)).toBe('abc');

    expect(trimText('the quick brown fox jumps', 400)).toBe(
      'the quick brown fox jumps',
    );
  });

  it('should return the original text when the text length is equal to maxLength', () => {
    expect(trimText('a', 1)).toBe('a');
    expect(trimText('ab', 2)).toBe('ab');
    expect(trimText('abc', 3)).toBe('abc');

    expect(trimText('the quick brown fox jumps', 25)).toBe(
      'the quick brown fox jumps',
    );
  });

  it('should return the first maxLength characters of the text when (maxLength <= 3)', () => {
    expect(trimText('the quick brown fox jumps', 0)).toBe('');
    expect(trimText('the quick brown fox jumps', 1)).toBe('t');
    expect(trimText('the quick brown fox jumps', 2)).toBe('th');
    expect(trimText('the quick brown fox jumps', 3)).toBe('the');
  });

  it('should return ellipsized text when (text.length > maxLength) && (maxLength > 3)', () => {
    expect(trimText('the quick brown fox jumps', 4)).toBe('t...');
    expect(trimText('the quick brown fox jumps', 5)).toBe('th...');
    expect(trimText('the quick brown fox jumps', 6)).toBe('the...');
    expect(trimText('the quick brown fox jumps', 7)).toBe('the ...');
    expect(trimText('the quick brown fox jumps', 8)).toBe('the q...');
    expect(trimText('the quick brown fox jumps', 9)).toBe('the qu...');
  });

  it("shouldn't return a string longer than maxLength", () => {
    expect(trimText('', 0).length).toBeLessThanOrEqual(0);
    expect(trimText('a', 0).length).toBeLessThanOrEqual(0);
    expect(trimText('ab', 0).length).toBeLessThanOrEqual(0);
    expect(trimText('abc', 0).length).toBeLessThanOrEqual(0);

    expect(trimText('', 1).length).toBeLessThanOrEqual(1);
    expect(trimText('a', 1).length).toBeLessThanOrEqual(1);
    expect(trimText('ab', 1).length).toBeLessThanOrEqual(1);
    expect(trimText('abc', 1).length).toBeLessThanOrEqual(1);

    expect(trimText('', 2).length).toBeLessThanOrEqual(2);
    expect(trimText('a', 2).length).toBeLessThanOrEqual(2);
    expect(trimText('ab', 2).length).toBeLessThanOrEqual(2);
    expect(trimText('abc', 2).length).toBeLessThanOrEqual(2);

    expect(trimText('', 3).length).toBeLessThanOrEqual(3);
    expect(trimText('a', 3).length).toBeLessThanOrEqual(3);
    expect(trimText('ab', 3).length).toBeLessThanOrEqual(3);
    expect(trimText('abc', 3).length).toBeLessThanOrEqual(3);
  });
});
