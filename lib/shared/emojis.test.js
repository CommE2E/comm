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

  it('should not match when U+FE0F suffixed', () => {
    // See D8145 for more context
    expect('⚓️').not.toMatch(onlyOneEmojiRegex);
  });
});
