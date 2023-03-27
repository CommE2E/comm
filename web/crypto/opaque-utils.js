// @flow

import { __wbg_set_wasm } from '@commapp/opaque-ke-wasm/pkg/comm_opaque2_wasm_bg.js';

declare var opaqueFilename: string;

const path = opaqueFilename
  ? `compiled/${opaqueFilename}`
  : 'http://localhost:8080/opaque-ke.wasm';

async function initOpaque() {
  const response = await fetch(path);
  const text = await response.text();
  __wbg_set_wasm(text);
}

export { initOpaque };
