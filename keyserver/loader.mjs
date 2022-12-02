// @flow

const localPackages = {
  landing: 'landing',
  lib: 'lib',
  web: 'web',
  ['opaque-ke-napi']: 'keyserver/addons/opaque-ke-napi',
};

async function resolve(specifier, context, nextResolve) {
  const defaultResult = await nextResolve(specifier, context);

  for (const pkg in localPackages) {
    if (specifier !== pkg && !specifier.startsWith(`${pkg}/`)) {
      continue;
    }
    const path = localPackages[pkg];
    const url = defaultResult.url.replace(path, `keyserver/dist/${pkg}`);
    return { url };
  }

  return defaultResult;
}

export { resolve };
