import url from 'url';
import Module from 'module';
import fs from 'fs';
import { promisify } from 'util';

const builtins = Module.builtinModules;
const extensions = { js: 'esm', json: "json" };
const access = promisify(fs.access);
const readFile = promisify(fs.readFile);
const baseURL = new url.URL('file://');

export async function resolve(
  specifier,
  parentModuleURL = baseURL,
  defaultResolve,
) {
  // Hitting node.js builtins from server
  if (builtins.includes(specifier)) {
    //console.log(`${specifier} is builtin`);
    return {
      url: specifier,
      format: 'builtin',
    };
  }

  // Hitting lib from server or web
  if (specifier.startsWith('lib')) {
    const result = defaultResolve(specifier, parentModuleURL);
    const resultURL =
      result.url.replace("squadcal/lib", "squadcal/server/dist/lib");
    //console.log(`${specifier} -> ${resultURL} is server/web -> lib`);
    const isJSON = resultURL.search(/json(:[0-9]+)?$/) !== -1;
    return {
      url: resultURL,
      format: isJSON ? 'json' : 'esm',
    };
  }

  // Hitting web/dist/app.build from server
  if (specifier === 'web/dist/app.build') {
    const [ rootURL ] = parentModuleURL.split("/squadcal/");
    const resultURL = `${rootURL}/squadcal/server/dist/web/dist/app.build`;
    //console.log(`${specifier} -> ${resultURL} is server -> web`);
    return {
      url: resultURL,
      format: "cjs",
    };
  }

  // Hitting web from server
  if (specifier.startsWith('web')) {
    const result = defaultResolve(specifier, parentModuleURL);
    const resultURL = result.url.replace(
      "squadcal/web",
      "squadcal/server/dist/web",
    );
    //console.log(`${specifier} -> ${resultURL} is server -> web`);
    return {
      url: resultURL,
      format: 'esm',
    };
  }

  // Hitting server from server
  if (
    /^\.{0,2}[/]/.test(specifier) === true ||
    specifier.startsWith('file:')
  ) {
    let error;
    try {
      const candidateURL = new url.URL(specifier, parentModuleURL);
      await access(candidateURL.pathname);
      return {
        url: candidateURL.href,
        format: "esm",
      };
    } catch (err) {
      error = err;
    }
    for (let extension in extensions) {
      const candidate = `${specifier}.${extension}`;
      try {
        const candidateURL = new url.URL(candidate, parentModuleURL);
        await access(candidateURL.pathname);
        const resultURL = candidateURL.href;
        //console.log(`${specifier} -> ${resultURL} is server -> server`);
        return {
          url: resultURL,
          format: extensions[extension],
        };
      } catch (err) {
        error = err;
      }
    }
    const result = defaultResolve(specifier, parentModuleURL);
    //console.log(`couldn't figure out ${specifier} -> ${result.url}`);
    return result;
  }

  // Hitting node_modules from lib
  if (parentModuleURL.includes("squadcal/server/dist/lib")) {
    const replacedModuleURL = parentModuleURL.replace(
      "squadcal/server/dist/lib",
      "squadcal/lib",
    );
    const result = await resolveModule(
      specifier,
      defaultResolve(specifier, replacedModuleURL),
    );
    //console.log(`${specifier} -> ${result.url} is lib -> node_modules`);
    return result;
  }

  // Hitting node_modules from web
  if (parentModuleURL.includes("squadcal/server/dist/web")) {
    const replacedModuleURL = parentModuleURL.replace(
      "squadcal/server/dist/web",
      "squadcal/web",
    );
    const result = await resolveModule(
      specifier,
      defaultResolve(specifier, replacedModuleURL),
    );
    //console.log(`${specifier} -> ${result.url} is web -> node_modules`);
    return result;
  }

  // Hitting node_modules from server
  const result = await resolveModule(
    specifier,
    defaultResolve(specifier, parentModuleURL),
  );
  //console.log(`${specifier} -> ${result.url} is server -> node_modules`);
  return result;
}

async function resolveModule(specifier, defaultResult) {
  // defaultResult resolves as commonjs, and we do that for almost every module.
  // We use esm in several specific cases below, as commonjs causes errors.
  if (
    !specifier.startsWith('reselect') &&
    !specifier.startsWith('redux') &&
    !specifier.startsWith('lodash-es') &&
    !specifier.startsWith('react-router') &&
    !specifier.startsWith('history')
  ) {
    return defaultResult;
  }

  const [ module, localPath ] = specifier.split('/');
  const moduleFolder = defaultResult.url.match(
    new RegExp(`file://(.*node_modules\/${module})`),
  )[1];
  if (localPath) {
    const esPathURL = new url.URL(`file://${moduleFolder}/es/${localPath}.js`);
    try {
      await access(esPathURL.pathname);
      return {
        url: esPathURL.href,
        format: "esm",
      };
    } catch (err) {
      return {
        url: defaultResult.url,
        format: "esm",
      };
    }
  }

  const packageConfig = await readFile(`${moduleFolder}/package.json`);
  const packageJSON = JSON.parse(packageConfig);
  if (packageJSON["jsnext:main"]) {
    return {
      url: `file://${moduleFolder}/${packageJSON["jsnext:main"]}`,
      format: "esm",
    };
  }
  if (packageJSON.module) {
    return {
      url: `file://${moduleFolder}/${packageJSON.module}`,
      format: "esm",
    };
  }

  return defaultResult;
}
