// @flow

import type { SQLiteAPI } from 'lib/types/sqlite-types.js';

import { commCoreModule } from '../native-modules.js';

const sqliteAPI: SQLiteAPI = {
  // read operations
  getAllReceivedMessageToDevice: commCoreModule.getAllReceivedMessageToDevice,

  // write operations
  removeReceivedMessagesToDevice: commCoreModule.removeReceivedMessagesToDevice,
};

export { sqliteAPI };
