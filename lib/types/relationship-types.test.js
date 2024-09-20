// @flow

import { legacyFarcasterRelationshipRequestValidator } from './relationship-types.js';

describe('updateFarcasterRelationshipInputValidator', () => {
  test('SHOULD validate input with 2 userIDsToFID entries', () => {
    const input = {
      action: 'farcaster',
      userIDsToFID: {
        '256': 'f256',
        '512': 'f512',
      },
    };
    expect(legacyFarcasterRelationshipRequestValidator.is(input)).toBe(true);
  });

  test('Should not validate if action is not farcaster', () => {
    const input = {
      action: 'NOT_FARCASTER',
      userIDsToFID: {
        '256': 'f256',
        '512': 'f512',
      },
    };
    expect(legacyFarcasterRelationshipRequestValidator.is(input)).toBe(false);
  });
});
