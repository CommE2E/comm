// @flow

import initOpaqueKe from '@commapp/opaque-ke-wasm';

declare var opaqueURL: string;

let opaqueKeLoadingState: void | true | Promise<void>;

function initOpaque(): Promise<void> {
  if (opaqueKeLoadingState === true) {
    return Promise.resolve();
  }
  if (!opaqueKeLoadingState) {
    opaqueKeLoadingState = initOpaqueKe(opaqueURL);
  }
  return opaqueKeLoadingState;
}

export { initOpaque };
