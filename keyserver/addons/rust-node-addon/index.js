// @flow

const { platform, arch } = process;

type IdentityAPI = {
  +registerUser: (
    userId: string,
    deviceId: string,
    username: string,
    password: string,
    userPublicKey: string,
  ) => Promise<string>,
};

async function getIdentityRustAPI(): Promise<IdentityAPI> {
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
    throw new Error('Failed to load native binding');
  }

  const { registerUser } = nativeBinding.registerUser;
  return { registerUser };
}

interface TunnelbrokerClientClass {
  new(
    onReceiveCallback: (err: Error | null, value: string) => any,
  ): TunnelbrokerClientClass;
  publish(toDeviceId: string, payload: string): Promise<void>;
}

async function getTunnelbrokerRustClient(): Promise<TunnelbrokerClientClass> {
  let nativeBinding = null;
  if (platform === 'darwin' && arch === 'x64') {
    // $FlowFixMe
    nativeBinding = await import('./naupi/rust-node-addon.darwin-x64.node');
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
    throw new Error('Failed to load native binding');
  }

  const { TunnelbrokerClient } = nativeBinding.TunnelbrokerClient;
  // $FlowFixMe
  return { TunnelbrokerClient };
}

export { getIdentityRustAPI, getTunnelbrokerRustClient };
