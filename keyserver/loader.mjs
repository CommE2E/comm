const localPackages = ['landing', 'lib', 'web'];

async function resolve(specifier, context, defaultResolve) {
  const defaultResult = defaultResolve(specifier, context, defaultResolve);

  // Special hack to use Babel-transpiled lib and web
  if (localPackages.some(pkg => specifier.startsWith(`${pkg}/`))) {
    const url = defaultResult.url.replace(
      specifier,
      `server/dist/${specifier}`,
    );
    return { url };
  }

  return defaultResult;
}

export { resolve };
