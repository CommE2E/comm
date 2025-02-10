// @flow

import type { Utility as OlmUtility } from '@commapp/olm';
import olm from '@commapp/olm';

let cachedOLMUtility: OlmUtility;
function getOlmUtility(): OlmUtility {
  if (cachedOLMUtility) {
    return cachedOLMUtility;
  }
  // This Olm Utility is created once and is cached for the entire
  // program lifetime, there is no need to free the memory.
  cachedOLMUtility = new olm.Utility();
  return cachedOLMUtility;
}

export { getOlmUtility };
