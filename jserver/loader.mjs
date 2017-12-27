import url from 'url';
import Module from 'module';

const builtins = Module.builtinModules;

export async function resolve(specifier, parentModuleURL, defaultResolve) {
  if (builtins.includes(specifier)) {
    return {
      url: specifier,
      format: 'builtin',
    };
  }
  if (specifier.startsWith('lib')) {
    const result = defaultResolve(specifier, parentModuleURL);
    return {
      url: result.url.replace("squadcal/lib", "squadcal/jserver/dist/lib"),
      format: 'esm',
    };
  }
  if (
    /^\.{0,2}[/]/.test(specifier) !== true &&
    !specifier.startsWith('file:')
  ) {
    return defaultResolve(specifier, parentModuleURL);
  }
  const resolved = new url.URL(specifier + ".js", parentModuleURL);
  return {
    url: resolved.href,
    format: 'esm',
  };
}
