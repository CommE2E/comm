import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

// We prefer to resolve packages as modules.
// (1) It allows us to do destructuring imports in Node
// (2) Sometimes a CJS module won't specify a default export, in which case
//     Node won't allow a default import either. This prevents all imports
// (3) Sometimes Flow libdefs don't specify a default export
const forceResolveAsModule = {
  'reselect': 'module',
  'redux': 'module',
  'reselect-map': 'jsnext:main',
};

async function resolve(
  specifier,
  context,
  defaultResolve,
) {
  const defaultResult = defaultResolve(specifier, context, defaultResolve);

  // Special hack to use Babel-transpiled lib and web
  if (specifier.startsWith('lib/') || specifier.startsWith('web/')) {
    const url = defaultResult.url.replace(
      specifier,
      `server/dist/${specifier}`,
    );
    return { url };
  }

  const forceModuleKey = forceResolveAsModule[specifier];
  if (forceModuleKey) {
    const moduleFolder = defaultResult.url.match(
      new RegExp(`file://(.*node_modules\/${specifier})`),
    )[1];
    const packageConfig = await readFile(`${moduleFolder}/package.json`);
    const packageJSON = JSON.parse(packageConfig);
    const pathToModule = packageJSON[forceModuleKey];
    if (pathToModule) {
      return {
        url: `file://${moduleFolder}/${pathToModule}`,
      };
    }
  }

  return defaultResult;
}

async function getFormat(
  url,
  context,
  defaultGetFormat,
) {
  for (let packageName in forceResolveAsModule) {
    if (url.indexOf(`node_modules/${packageName}`) >= 0) {
      return { format: 'module' };
    }
  }
  return defaultGetFormat(url, context, defaultGetFormat);
}

export {
  resolve,
  getFormat,
};
