// @flow

import {
  type MessageStoreOperation,
  messageStoreOpsHandlers,
} from 'lib/ops/message-store-ops.js';
import { messageID } from 'lib/shared/message-utils.js';
import { unshimFunc } from 'lib/shared/unshim-utils.js';
import { type MessageType } from 'lib/types/message-types-enum.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import { translateClientDBMessageInfoToRawMessageInfo } from 'lib/utils/message-ops-utils.js';

import type { AppState } from './state-types.js';
import { commCoreModule } from '../native-modules.js';

const {
  processStoreOperations: processMessageStoreOperations,
  convertOpsToClientDBOps: convertMessageOpsToClientDBOps,
} = messageStoreOpsHandlers;

function unshimClientDB(
  state: AppState,
  unshimTypes: $ReadOnlyArray<MessageType>,
  handleMigrationFailure?: AppState => AppState,
): AppState {
  // 1. Get messages from SQLite `messages` table.
  const clientDBMessageInfos = commCoreModule.getInitialMessagesSync();

  // 2. Translate `ClientDBMessageInfo`s to `RawMessageInfo`s.
  const rawMessageInfos = clientDBMessageInfos.map(
    translateClientDBMessageInfoToRawMessageInfo,
  );

  // 3. "Unshim" translated `RawMessageInfo`s.
  const unshimmedRawMessageInfos = rawMessageInfos.map(messageInfo =>
    unshimFunc(messageInfo, new Set(unshimTypes)),
  );

  // 4. Construct `MessageStoreOperation`s to clear SQLite `messages` table and
  //    repopulate with unshimmed `RawMessageInfo`s.
  const operations: $ReadOnlyArray<MessageStoreOperation> = [
    {
      type: 'remove_all',
    },
    ...unshimmedRawMessageInfos.map((message: RawMessageInfo) => ({
      type: 'replace',
      payload: { id: messageID(message), messageInfo: message },
    })),
  ];

  // 5. Try processing `ClientDBMessageStoreOperation`s and log out if
  //    `processMessageStoreOperationsSync(...)` throws an exception.
  try {
    const convertedMessageStoreOperations =
      convertMessageOpsToClientDBOps(operations);
    commCoreModule.processMessageStoreOperationsSync(
      convertedMessageStoreOperations,
    );
    const processedMessageStore = processMessageStoreOperations(
      state.messageStore,
      operations,
    );
    return {
      ...state,
      messageStore: processedMessageStore,
    };
  } catch (exception) {
    console.log(exception);
    if (handleMigrationFailure) {
      return handleMigrationFailure(state);
    }
    return ({ ...state, cookie: null }: any);
  }
}

export { unshimClientDB };
