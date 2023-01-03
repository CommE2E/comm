// @flow

import { oldValidUsernameRegexString } from 'lib/shared/account-utils';

const nativeTypeaheadRegex: RegExp = new RegExp(
  `((^(.|\n)*\\s+)|^)@(${oldValidUsernameRegexString})?$`,
);

export { nativeTypeaheadRegex };
