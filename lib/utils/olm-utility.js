// @flow

import { Utility } from 'vodozemac';

let cachedOlmUtility: Utility;
function getOlmUtility(): Utility {
  if (cachedOlmUtility) {
    return cachedOlmUtility;
  }
  // This `Utility` is created once and is cached for the entire
  // program lifetime, there is no need to free the memory.
  cachedOlmUtility = new Utility();
  return cachedOlmUtility;
}

export { getOlmUtility };
