// @flow

import { oldValidUsernameRegexString } from 'lib/shared/account-utils';

// Native regex is a little bit different than web one as
// there are no named capturing groups yet on native.
const nativeTypeaheadRegex: RegExp = new RegExp(
  `((^(.|\n)*\\s+)|^)@(${oldValidUsernameRegexString})?$`,
);

export { nativeTypeaheadRegex };
