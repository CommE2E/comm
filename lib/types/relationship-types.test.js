// @flow

import { updateFarcasterRelationshipInputValidator } from './relationship-types.js';

describe('updateFarcasterRelationshipInputValidator', () => {
  test('SHOULD validate input with exactly 2 userIDsToFID entries', () => {
    const input = {
      action: 'farcaster',
      userIDsToFID: {
        '256': 'f256',
        '512': 'f512',
      },
    };
    expect(updateFarcasterRelationshipInputValidator.is(input)).toBe(true);
  });

  test('SHOULD NOT validate input with > 2 userIDsToFID entries', () => {
    const input = {
      action: 'farcaster',
      userIDsToFID: {
        '256': 'f256',
        '512': 'f512',
        '1024': 'f1024',
      },
    };
    expect(updateFarcasterRelationshipInputValidator.is(input)).toBe(false);
  });

  test('SHOULD NOT validate input with < 2 userIDsToFID entries', () => {
    const input = {
      action: 'farcaster',
      userIDsToFID: {
        '256': 'f256',
      },
    };
    expect(updateFarcasterRelationshipInputValidator.is(input)).toBe(false);
  });

  test('Should not validate if action is not farcaster', () => {
    const input = {
      action: 'NOT_FARCASTER',
      userIDsToFID: {
        '256': 'f256',
        '512': 'f512',
      },
    };
    expect(updateFarcasterRelationshipInputValidator.is(input)).toBe(false);
  });
});
