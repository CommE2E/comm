// @flow

import { oldValidUsernameRegexString } from 'lib/shared/account-utils.js';
import { validChatNameRegexString } from 'lib/shared/thread-utils.js';

// Native regex is a little bit different than web one as
// there are no named capturing groups yet on native.
const nativeMentionTypeaheadRegex: RegExp = new RegExp(
  `((^(.|\n)*\\s+)|^)@(${oldValidUsernameRegexString}|${validChatNameRegexString})?$`,
);

export { nativeMentionTypeaheadRegex };
