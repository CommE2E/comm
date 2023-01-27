// @flow

import { onlyOneEmojiRegex } from './emojis';

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
});
