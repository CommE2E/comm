import url from 'url';
import Module from 'module';
import fs from 'fs';
import Promise from 'promise';

const builtins = Module.builtinModules;
const extensions = { js: 'esm', json: "json" };
const access = Promise.denodeify(fs.access);

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
  let error;
  for (let extension in extensions) {
    const candidate = `${specifier}.${extension}`;
    try {
      const candidateURL = new url.URL(candidate, parentModuleURL);
      await access(candidateURL.pathname);
      return {
        url: candidateURL.href,
        format: extensions[extension],
      };
    } catch (err) {
      error = err;
    }
  }
  throw error;

}
