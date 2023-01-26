// @flow

const localPackages = {
  landing: 'landing',
  lib: 'lib',
  web: 'web',
  ['rust-node-addon']: 'keyserver/addons/rust-node-addon',
};

async function resolve(specifier, context, nextResolve) {
  const defaultResult = await nextResolve(specifier, context);

  for (const pkg in localPackages) {
    if (specifier !== pkg && !specifier.startsWith(`${pkg}/`)) {
      continue;
    }
    const path = localPackages[pkg];
    const url = defaultResult.url.replace(`comm/${path}`, `comm/keyserver/dist/${pkg}`);
    return { url };
  }

  return defaultResult;
}

export { resolve };
