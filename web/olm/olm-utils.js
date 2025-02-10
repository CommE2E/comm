// @flow

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

export { initOlm };
