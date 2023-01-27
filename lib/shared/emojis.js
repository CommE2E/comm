// @flow

import emojiRegex from 'emoji-regex';
import invariant from 'invariant';

const emojiRegexMatches = emojiRegex().toString().match('^/(.+)/g$');
invariant(
  emojiRegexMatches.length === 2,
  'could not extract innerEmojiRegex from emoji-regex.js',
);
const innerEmojiRegexString = emojiRegexMatches[1];
const onlyEmojiRegex: RegExp = new RegExp(`^(${innerEmojiRegexString})+$`);

export { onlyEmojiRegex };
