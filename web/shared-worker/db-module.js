// @flow

import Module from './_generated/comm-query-executor.js';
import type { EmscriptenModule } from './types/module.js';
import { DEFAULT_COMM_QUERY_EXECUTOR_FILENAME } from './utils/constants.js';
import { SQLiteQueryExecutorWrapper } from './utils/sql-query-executor-wrapper.js';

async function getDatabaseModule(
  databaseModuleFilename?: ?string,
  webworkerModulesFilePath?: string,
): Promise<EmscriptenModule> {
  const fileName = databaseModuleFilename
    ? databaseModuleFilename
    : DEFAULT_COMM_QUERY_EXECUTOR_FILENAME;

  return await Module({
    locateFile: (path: string, prefix?: string) => {
      if (webworkerModulesFilePath) {
        return `${webworkerModulesFilePath}/${fileName}`;
      }
      return `${prefix ?? ''}${fileName}`;
    },
  });
}

function createSQLiteQueryExecutor(
  dbModule: EmscriptenModule,
  filePath: string,
  skipMigration: boolean = false,
): SQLiteQueryExecutorWrapper {
  const rawExecutor = new dbModule.SQLiteQueryExecutor(filePath, skipMigration);
  return new SQLiteQueryExecutorWrapper(rawExecutor, dbModule);
}

export { getDatabaseModule, createSQLiteQueryExecutor };
