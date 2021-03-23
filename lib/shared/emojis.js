// @flow

import emojiRegex from 'emoji-regex/RGI_Emoji.js';
import invariant from 'invariant';

const emojiRegexMatches = emojiRegex().toString().match('^/(.+)/g$');
invariant(
  emojiRegexMatches.length === 2,
  'could not extract innerEmojiRegex from emoji-regex/RGI_Emoji.js',
);
const innerEmojiRegexString = emojiRegexMatches[1];
const onlyEmojiRegex: RegExp = new RegExp(`^(${innerEmojiRegexString})+$`);

export { onlyEmojiRegex };
