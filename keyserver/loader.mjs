// @flow

const localPackages = ['landing', 'lib', 'web'];

async function resolve(specifier, context, nextResolve) {
  const defaultResult = await nextResolve(specifier, context);

  // Special hack to use Babel-transpiled lib and web
  if (localPackages.some(pkg => specifier.startsWith(`${pkg}/`))) {
    const url = defaultResult.url.replace(
      specifier,
      `keyserver/dist/${specifier}`,
    );
    return { url };
  }

  return defaultResult;
}

export { resolve };
