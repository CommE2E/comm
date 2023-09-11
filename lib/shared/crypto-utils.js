//@flow

import type { OLMOneTimeKeys } from '../types/crypto-types';
import { values } from '../utils/objects.js';

function getOneTimeKeyValues(
  oneTimeKeys: OLMOneTimeKeys,
): $ReadOnlyArray<string> {
  const keys: $ReadOnlyArray<string> = values(oneTimeKeys.curve25519);
  return keys;
}

export { getOneTimeKeyValues };
