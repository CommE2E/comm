// @flow

import type { SQLiteAPI } from 'lib/types/sqlite-types.js';

import { commCoreModule } from '../native-modules.js';
import { processDBStoreOperations } from '../redux/redux-utils.js';

const sqliteAPI: SQLiteAPI = {
  // read operations
  getAllReceivedMessageToDevice: commCoreModule.getAllReceivedMessageToDevice,

  // write operations
  removeReceivedMessagesToDevice: commCoreModule.removeReceivedMessagesToDevice,

  processDBStoreOperations,
};

export { sqliteAPI };
