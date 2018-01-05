import url from 'url';
import Module from 'module';
import fs from 'fs';
import Promise from 'promise';

const builtins = Module.builtinModules;
const extensions = { js: 'esm', json: "json" };
const access = Promise.denodeify(fs.access);
const readFile = Promise.denodeify(fs.readFile);

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
    if (!parentModuleURL.includes("squadcal/jserver/dist/lib")) {
      return await lookForJsNextMain(
        specifier,
        defaultResolve(specifier, parentModuleURL),
      );
    }
    const replacedModuleURL = parentModuleURL.replace(
      "squadcal/jserver/dist/lib",
      "squadcal/lib",
    );
    return await lookForJsNextMain(
      specifier,
      defaultResolve(specifier, replacedModuleURL),
    );
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

async function lookForJsNextMain(module, result) {
  if (result.format !== "cjs" || module.includes('/')) {
    return result;
  }
  const moduleFolder =
    result.url.match(new RegExp(`file://(.*node_modules\/${module})`))[1];
  const packageConfig = await readFile(`${moduleFolder}/package.json`);
  const packageJSON = JSON.parse(packageConfig);
  if (packageJSON["jsnext:main"]) {
    return {
      url: `file://${moduleFolder}/${packageJSON["jsnext:main"]}`,
      format: "esm",
    };
  }
  return result;
}
