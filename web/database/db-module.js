// @flow

import Module from './_generated/comm-query-executor.js';
import type { EmscriptenModule } from './types/module.js';
import { DEFAULT_COMM_QUERY_EXECUTOR_FILENAME } from './utils/constants.js';

function getDatabaseModule(
  databaseModuleFilename?: ?string,
  databaseModuleFilePath?: string,
): EmscriptenModule {
  const fileName = databaseModuleFilename
    ? databaseModuleFilename
    : DEFAULT_COMM_QUERY_EXECUTOR_FILENAME;

  return Module({
    locateFile: (path: string, prefix?: string) => {
      if (databaseModuleFilePath) {
        return `${databaseModuleFilePath}/${fileName}`;
      }
      return `${prefix ?? ''}${fileName}`;
    },
  });
}

export { getDatabaseModule };
