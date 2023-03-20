// @flow

import {
  emojiAvatarDBContentValidator,
  ensAvatarDBContentValidator,
  imageAvatarDBContentValidator,
  updateUserAvatarRequestValidator,
} from './avatar-utils.js';

describe('emojiAvatarDBContentValidator', () => {
  it('should succeed for valid input', () => {
    expect(
      emojiAvatarDBContentValidator.is({
        type: 'emoji',
        emoji: '👍',
        color: '4b87aa',
      }),
    ).toBe(true);
  });

  it('should fail if type is incorrect', () => {
    expect(
      emojiAvatarDBContentValidator.is({
        type: 'memoji',
        emoji: '👍',
        color: '4b87aa',
      }),
    ).toBe(false);
  });

  it(`should fail if emoji isn't valid`, () => {
    expect(
      emojiAvatarDBContentValidator.is({
        type: 'emoji',
        emoji: ':)',
        color: '4b87aa',
      }),
    ).toBe(false);
  });

  it(`should fail if color isn't valid`, () => {
    expect(
      emojiAvatarDBContentValidator.is({
        type: 'emoji',
        emoji: '👍',
        color: '#4b87aa',
      }),
    ).toBe(false);
    expect(
      emojiAvatarDBContentValidator.is({
        type: 'emoji',
        emoji: '👍',
        color: '#4b87aa00',
      }),
    ).toBe(false);
  });
});

describe('imageAvatarDBContentValidator', () => {
  it('should succeed for valid input', () => {
    expect(
      imageAvatarDBContentValidator.is({
        type: 'image',
        uploadID: '123456',
      }),
    ).toBe(true);
  });

  it('should fail if type is incorrect', () => {
    expect(
      imageAvatarDBContentValidator.is({
        type: 'emoji',
        uploadID: '123456',
      }),
    ).toBe(false);
  });

  it('should fail if uploadID is incorrect type', () => {
    expect(
      imageAvatarDBContentValidator.is({
        type: 'image',
        uploadID: 123456,
      }),
    ).toBe(false);
  });
});

describe('ensAvatarDBContentValidator', () => {
  it('should succeed for valid input', () => {
    expect(
      ensAvatarDBContentValidator.is({
        type: 'ens',
      }),
    ).toBe(true);
  });

  it('should fail for incorrect type', () => {
    expect(
      ensAvatarDBContentValidator.is({
        type: 'emoji',
      }),
    ).toBe(false);
  });
});

describe('updateUserAvatarRemoveRequestValidator', () => {
  it('should succeed for valid input', () => {
    expect(
      updateUserAvatarRequestValidator.is({
        type: 'remove',
      }),
    ).toBe(true);
  });

  it('should succeed for incorrect type', () => {
    expect(
      updateUserAvatarRequestValidator.is({
        type: 'emoji',
      }),
    ).toBe(false);
  });
});
