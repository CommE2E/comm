// @flow

import initOpaqueKe from '@commapp/opaque-ke-wasm';

declare var opaqueURL: string;

let opaqueKeLoadingState: void | true | Promise<mixed>;

function initOpaque(overrideOpaqueURL?: ?string): Promise<mixed> {
  const finalOpaqueURL = overrideOpaqueURL ?? opaqueURL;
  if (opaqueKeLoadingState === true) {
    return Promise.resolve();
  }
  if (!opaqueKeLoadingState) {
    opaqueKeLoadingState = initOpaqueKe(finalOpaqueURL);
  }
  return opaqueKeLoadingState;
}

export { initOpaque };
