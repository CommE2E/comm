//@flow

import type { OLMOneTimeKeys } from '../types/crypto-types';
import { values } from '../utils/objects.js';

function getOneTimeKeyValues(
  oneTimeKeys: OLMOneTimeKeys,
): $ReadOnlyArray<string> {
  return values(oneTimeKeys.curve25519);
}

function getOneTimeKeyValuesFromBlob(keyBlob: string): $ReadOnlyArray<string> {
  const oneTimeKeys: OLMOneTimeKeys = JSON.parse(keyBlob);
  return getOneTimeKeyValues(oneTimeKeys);
}

export { getOneTimeKeyValues, getOneTimeKeyValuesFromBlob };
