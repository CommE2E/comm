// @flow

import invariant from 'invariant';
import { createRequire } from 'module';

import type { RustNativeBindingAPI } from './rust-binding-types.js';

const { platform, arch } = process;

let nativeBindingRequire;

if (process.env.NODE_ENV === 'test') {
  // In Jest, ES modules and import.meta are not fully supported, so we fall
  // back to the traditional Node.js require function to load our modules.
  nativeBindingRequire = require;
} else {
  const importMetaURL = import.meta.url;
  invariant(importMetaURL, 'import.meta.url should be set');
  nativeBindingRequire = createRequire(importMetaURL);
}

async function getRustAPI(): Promise<RustNativeBindingAPI> {
  let nativeBinding = null;
  if (platform === 'darwin' && arch === 'x64') {
    // $FlowFixMe
    nativeBinding = nativeBindingRequire(
      './napi/rust-node-addon.darwin-x64.node',
    );
  } else if (platform === 'darwin' && arch === 'arm64') {
    // $FlowFixMe
    nativeBinding = nativeBindingRequire(
      './napi/rust-node-addon.darwin-arm64.node',
    );
  } else if (platform === 'linux' && arch === 'x64') {
    // $FlowFixMe
    nativeBinding = nativeBindingRequire(
      './napi/rust-node-addon.linux-x64-gnu.node',
    );
  } else if (platform === 'linux' && arch === 'arm64') {
    // $FlowFixMe
    nativeBinding = nativeBindingRequire(
      './napi/rust-node-addon.linux-arm64-gnu.node',
    );
  } else {
    throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`);
  }

  if (!nativeBinding) {
    throw new Error('Failed to load Rust native binding');
  }

  return nativeBinding;
}

export { getRustAPI };
