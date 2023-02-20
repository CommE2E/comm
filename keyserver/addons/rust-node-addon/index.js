// @flow

import type { RustNativeBindingAPI } from 'lib/types/rust-binding-types.js';

const { platform, arch } = process;

async function getRustAPI(): Promise<RustNativeBindingAPI> {
  let nativeBinding = null;
  if (platform === 'darwin' && arch === 'x64') {
    // $FlowFixMe
    nativeBinding = await import('./napi/rust-node-addon.darwin-x64.node');
  } else if (platform === 'darwin' && arch === 'arm64') {
    // $FlowFixMe
    nativeBinding = await import('./napi/rust-node-addon.darwin-arm64.node');
  } else if (platform === 'linux' && arch === 'x64') {
    // $FlowFixMe
    nativeBinding = await import('./napi/rust-node-addon.linux-x64-gnu.node');
  } else if (platform === 'linux' && arch === 'arm64') {
    // $FlowFixMe
    nativeBinding = await import('./napi/rust-node-addon.linux-arm64-gnu.node');
  } else {
    throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`);
  }

  if (!nativeBinding) {
    throw new Error('Failed to load Rust native binding');
  }

  return nativeBinding.default;
}

export { getRustAPI };
