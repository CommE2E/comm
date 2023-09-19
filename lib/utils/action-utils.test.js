// @flow

import { extractKeyserverIDFromID } from './action-utils.js';

describe('extractKeyserverIDFromID', () => {
  it('should return <keyserverID> for <keyserverID>|<number>', () => {
    const keyserverID = '404';
    const id = keyserverID + '|1234';
    expect(extractKeyserverIDFromID(id)).toBe(keyserverID);
  });
  it('should return null if the id contains nonnumerical characters', () => {
    const id1 = 'a256|1234';
    expect(extractKeyserverIDFromID(id1)).toBe(null);
    const id2 = '256|1234b';
    expect(extractKeyserverIDFromID(id2)).toBe(null);
    const id3 = '256|c1234';
    expect(extractKeyserverIDFromID(id3)).toBe(null);
  });
  it("should return null if the id doesn't contain |", () => {
    const id = '2561234';
    expect(extractKeyserverIDFromID(id)).toBe(null);
  });
  it('should return null if the | is not between two numbers', () => {
    const id1 = '2561234|';
    expect(extractKeyserverIDFromID(id1)).toBe(null);
    const id2 = '|2561234';
    expect(extractKeyserverIDFromID(id2)).toBe(null);
    const id3 = '2561234|a';
    expect(extractKeyserverIDFromID(id3)).toBe(null);
    const id4 = 'a|2561234';
    expect(extractKeyserverIDFromID(id4)).toBe(null);
  });
});
