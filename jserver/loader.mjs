import url from 'url';
import Module from 'module';
import fs from 'fs';
import Promise from 'promise';

const builtins = Module.builtinModules;
const extensions = { js: 'esm', json: "json" };
const access = Promise.denodeify(fs.access);
const readFile = Promise.denodeify(fs.readFile);

export async function resolve(specifier, parentModuleURL, defaultResolve) {
  // Hitting node.js builtins from jserver
  if (builtins.includes(specifier)) {
    //console.log(`${specifier} is builtin`);
    return {
      url: specifier,
      format: 'builtin',
    };
  }

  // Hitting lib from jserver or web
  if (specifier.startsWith('lib')) {
    const result = defaultResolve(specifier, parentModuleURL);
    const resultURL =
      result.url.replace("squadcal/lib", "squadcal/jserver/dist/lib");
    //console.log(`${specifier} -> ${resultURL} is jserver/web -> lib`);
    return {
      url: resultURL,
      format: 'esm',
    };
  }

  // Hitting web from jserver
  if (specifier.startsWith('web')) {
    const result = defaultResolve(specifier, parentModuleURL);
    const resultURL = result.url.replace("squadcal/web", "squadcal/jserver/dist/web");
    //console.log(`${specifier} -> ${resultURL} is jserver -> web`);
    return {
      url: resultURL,
      format: specifier === 'web/dist/app.build' ? 'cjs' : 'esm',
    };
  }

  // Hitting jserver from jserver
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
        //console.log(`${specifier} -> ${resultURL} is jserver -> jserver`);
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
  if (parentModuleURL.includes("squadcal/jserver/dist/lib")) {
    const replacedModuleURL = parentModuleURL.replace(
      "squadcal/jserver/dist/lib",
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
  if (parentModuleURL.includes("squadcal/jserver/dist/web")) {
    const replacedModuleURL = parentModuleURL.replace(
      "squadcal/jserver/dist/web",
      "squadcal/web",
    );
    const result = await resolveModule(
      specifier,
      defaultResolve(specifier, replacedModuleURL),
    );
    //console.log(`${specifier} -> ${result.url} is web -> node_modules`);
    return result;
  }

  // Hitting node_modules from jserver
  const result = await resolveModule(
    specifier,
    defaultResolve(specifier, parentModuleURL),
  );
  //console.log(`${specifier} -> ${result.url} is jserver -> node_modules`);
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
