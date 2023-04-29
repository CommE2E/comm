// @flow

import type { Utility } from '@commapp/olm';
import olm from '@commapp/olm';

declare var olmFilename: string;

async function initOlm(): Promise<void> {
  if (!olmFilename) {
    return await olm.init();
  }
  const locateFile = (wasmFilename: string, httpAssetsHost: string) =>
    httpAssetsHost + olmFilename;
  return await olm.init({ locateFile });
}

let olmUtilityInstance;
async function olmUtility(): Promise<Utility> {
  if (!olmUtilityInstance) {
    await initOlm();
    olmUtilityInstance = new olm.Utility();
  }
  return olmUtilityInstance;
}

export { initOlm, olmUtility };
