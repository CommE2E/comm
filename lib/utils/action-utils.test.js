// @flow

import { extractKeyserverIDFromID } from './action-utils.js';

describe('extractKeyserverIDFromID', () => {
  it('should return <keyserverID> for <keyserverID>|<number>', () => {
    const keyserverID = '404';
    const id = keyserverID + '|1234';
    expect(extractKeyserverIDFromID(id)).toBe(keyserverID);
  });
});
