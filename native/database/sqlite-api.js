// @flow

import type { SQLiteAPI } from 'lib/types/sqlite-types.js';

import { commCoreModule } from '../native-modules.js';
import { processDBStoreOperations } from '../redux/redux-utils.js';

const sqliteAPI: SQLiteAPI = {
  // read operations
  getAllInboundP2PMessage: commCoreModule.getAllInboundP2PMessage,
  getAllOutboundP2PMessage: commCoreModule.getAllOutboundP2PMessage,
  getRelatedMessages: commCoreModule.getRelatedMessages,

  // write operations
  removeInboundP2PMessages: commCoreModule.removeInboundP2PMessages,
  markOutboundP2PMessageAsSent: commCoreModule.markOutboundP2PMessageAsSent,
  removeOutboundP2PMessagesOlderThan:
    commCoreModule.removeOutboundP2PMessagesOlderThan,

  processDBStoreOperations,
};

export { sqliteAPI };
