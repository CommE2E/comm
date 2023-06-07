// @flow

import emojiRegex from 'emoji-regex';

const innerEmojiRegexString = emojiRegex().source;

const onlyEmojiRegex: RegExp = new RegExp(`^(${innerEmojiRegexString})+$`);
const onlyOneEmojiRegex: RegExp = new RegExp(`^(${innerEmojiRegexString})$`);

export { onlyEmojiRegex, onlyOneEmojiRegex };
