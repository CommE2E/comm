// @flow

import type { Utility as OlmUtility } from '@commapp/olm';
import olm from '@commapp/olm';

let cachedOlmUtility: OlmUtility;
function getOlmUtility(): OlmUtility {
  if (cachedOlmUtility) {
    return cachedOlmUtility;
  }
  // This `olm.Utility` is created once and is cached for the entire
  // program lifetime, there is no need to free the memory.
  cachedOlmUtility = new olm.Utility();
  return cachedOlmUtility;
}

export { getOlmUtility };
