// @flow

import type { SQLiteAPI } from 'lib/types/sqlite-types.js';

import { commCoreModule } from '../native-modules.js';
import { processDBStoreOperations } from '../redux/redux-utils.js';

const sqliteAPI: SQLiteAPI = {
  // read operations
  getAllInboundP2PMessage: commCoreModule.getAllInboundP2PMessage,

  // write operations
  removeInboundP2PMessages: commCoreModule.removeInboundP2PMessages,

  processDBStoreOperations,
};

export { sqliteAPI };
