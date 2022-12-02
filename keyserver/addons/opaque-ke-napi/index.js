// @flow

const { platform, arch } = process;

type RustAPI = {
  +sum: (a: number, b: number) => number,
};

async function getRustAPI(): Promise<RustAPI> {
  let nativeBinding = null;
  if (platform === 'darwin' && arch === 'x64') {
    // $FlowFixMe
    nativeBinding = await import('./napi/opaque-ke-napi.darwin-x64.node');
  } else if (platform === 'darwin' && arch === 'arm64') {
    // $FlowFixMe
    nativeBinding = await import('./napi/opaque-ke-napi.darwin-arm64.node');
  } else if (platform === 'linux' && arch === 'x64') {
    // $FlowFixMe
    nativeBinding = await import('./napi/opaque-ke-napi.linux-x64-gnu.node');
  } else if (platform === 'linux' && arch === 'arm64') {
    // $FlowFixMe
    nativeBinding = await import('./napi/opaque-ke-napi.linux-arm64-gnu.node');
  } else {
    throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`);
  }

  if (!nativeBinding) {
    throw new Error('Failed to load native binding');
  }

  const { sum } = nativeBinding.default;
  return { sum };
}

export { getRustAPI };
