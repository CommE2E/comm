// @flow

import { defaultEmojiAvatars } from './avatar-utils.js';
import { onlyOneEmojiRegex } from './emojis.js';

describe('onlyOneEmojiRegex', () => {
  it('should match for (👍)', () => {
    expect('👍').toMatch(onlyOneEmojiRegex);
  });

  it('should match for (🫡)', () => {
    expect('🫡').toMatch(onlyOneEmojiRegex);
  });

  it('should match for (🦶🏾)', () => {
    expect('🦶🏾').toMatch(onlyOneEmojiRegex);
  });

  it('should not match for (🦶🏾🙏)', () => {
    expect('🦶🏾🙏').not.toMatch(onlyOneEmojiRegex);
  });

  it('should not match for (that is 🔥)', () => {
    expect('that is 🔥').not.toMatch(onlyOneEmojiRegex);
  });

  it('should match all defaultEmojiAvatars', () => {
    for (const emojiAvatar of defaultEmojiAvatars) {
      const { emoji } = emojiAvatar;
      expect(emoji).toMatch(onlyOneEmojiRegex);
    }
  });
});
