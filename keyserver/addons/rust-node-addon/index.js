// @flow

import { createRequire } from 'module';

const { platform, arch } = process;
const require = createRequire(import.meta.url);

type RustAPI = {
  +registerUser: (
    userId: string,
    deviceId: string,
    username: string,
    password: string,
    userPublicKey: string,
  ) => Promise<string>,
};

async function getRustAPI(): Promise<RustAPI> {
  let nativeBinding = null;
  if (platform === 'darwin' && arch === 'x64') {
    // $FlowFixMe
    nativeBinding = require('./napi/rust-node-addon.darwin-x64.node');
  } else if (platform === 'darwin' && arch === 'arm64') {
    // $FlowFixMe
    nativeBinding = require('./napi/rust-node-addon.darwin-arm64.node');
  } else if (platform === 'linux' && arch === 'x64') {
    // $FlowFixMe
    nativeBinding = require('./napi/rust-node-addon.linux-x64-gnu.node');
  } else if (platform === 'linux' && arch === 'arm64') {
    // $FlowFixMe
    nativeBinding = require('./napi/rust-node-addon.linux-arm64-gnu.node');
  } else {
    throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`);
  }

  if (!nativeBinding) {
    throw new Error('Failed to load native binding');
  }

  const { registerUser } = nativeBinding;
  return { registerUser };
}

export { getRustAPI };
