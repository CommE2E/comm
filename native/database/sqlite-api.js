// @flow

import type { SQLiteAPI } from 'lib/types/sqlite-types.js';

import { commCoreModule } from '../native-modules.js';
import { processDBStoreOperations } from '../redux/redux-utils.js';

const sqliteAPI: SQLiteAPI = {
  // read operations
  getAllInboundP2PMessages: commCoreModule.getAllInboundP2PMessages,
  getAllOutboundP2PMessages: commCoreModule.getAllOutboundP2PMessages,
  getRelatedMessages: commCoreModule.getRelatedMessages,
  getOutboundP2PMessagesByID: commCoreModule.getOutboundP2PMessagesByID,
  searchMessages: commCoreModule.searchMessages,

  // write operations
  removeInboundP2PMessages: commCoreModule.removeInboundP2PMessages,
  markOutboundP2PMessageAsSent: commCoreModule.markOutboundP2PMessageAsSent,
  resetOutboundP2PMessagesForDevice:
    commCoreModule.resetOutboundP2PMessagesForDevice,
  removeOutboundP2PMessagesOlderThan:
    commCoreModule.removeOutboundP2PMessagesOlderThan,

  processDBStoreOperations,
};

export { sqliteAPI };
