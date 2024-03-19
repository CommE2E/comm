// @flow

import initOpaqueKe from '@commapp/opaque-ke-wasm';

let opaqueKeLoadingState: void | true | Promise<mixed>;

function initOpaque(opaqueURL: string): Promise<mixed> {
  if (opaqueKeLoadingState === true) {
    return Promise.resolve();
  }
  if (!opaqueKeLoadingState) {
    opaqueKeLoadingState = initOpaqueKe(opaqueURL);
  }
  return opaqueKeLoadingState;
}

export { initOpaque };
