import { pathToFileURL } from 'url';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const baseURL = pathToFileURL(process.cwd()).href;

export async function resolve(
  specifier,
  parentModuleURL = baseURL,
  defaultResolve,
) {
  const defaultResult = defaultResolve(specifier, parentModuleURL);

  // Special hack to use Babel-transpiled lib and web
  if (specifier.startsWith('lib/') || specifier.startsWith('web/')) {
    const url = defaultResult.url.replace(
      specifier,
      `server/dist/${specifier}`,
    );

    let format;
    if (url.search(/json(:[0-9]+)?$/) !== -1) {
      format = 'json';
    } else if (specifier === 'web/dist/app.build') {
      format = 'commonjs';
    } else {
      format = 'module';
    }

    return { url, format };
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
        format: 'module',
      };
    }
  }

  return defaultResult;
}
