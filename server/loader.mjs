import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

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

  // We prefer to resolve packages as modules so that Node allows us to do
  // destructuring imports, as sometimes Flow libdefs don't specify a default
  // export. defaultResolve doesn't look at the module property in package.json,
  // so we do it manually here
  if (specifier === 'reselect' || specifier === 'redux') {
    const moduleFolder = defaultResult.url.match(
      new RegExp(`file://(.*node_modules\/${specifier})`),
    )[1];
    const packageConfig = await readFile(`${moduleFolder}/package.json`);
    const packageJSON = JSON.parse(packageConfig);
    if (packageJSON.module) {
      return {
        url: `file://${moduleFolder}/${packageJSON.module}`,
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
  if (
    url.indexOf("node_modules/reselect") >= 0 ||
    url.indexOf("node_modules/redux") >= 0
  ) {
    return { format: 'module' };
  }
  return defaultGetFormat(url, context, defaultGetFormat);
}

export {
  resolve,
  getFormat,
};
