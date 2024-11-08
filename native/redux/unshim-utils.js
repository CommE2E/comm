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
import type { MigrationResult } from 'lib/utils/migration-utils.js';

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
): MigrationResult<AppState> {
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
    const processedMessageStore = processMessageStoreOperations(
      state.messageStore,
      operations,
    );
    return {
      state: {
        ...state,
        messageStore: processedMessageStore,
      },
      ops: {
        messageStoreOperations: operations,
      },
    };
  } catch (exception) {
    console.log(exception);
    if (handleMigrationFailure) {
      const newState = handleMigrationFailure(state);
      return { state: newState, ops: {} };
    }
    return {
      state: ({ ...state, cookie: null }: any),
      ops: {},
    };
  }
}

function legacyUnshimClientDB(
  prevState: AppState,
  unshimTypes: $ReadOnlyArray<MessageType>,
  handleMigrationFailure?: AppState => AppState,
): AppState {
  const { state, ops } = unshimClientDB(
    prevState,
    unshimTypes,
    handleMigrationFailure,
  );
  const { messageStoreOperations } = ops;
  if (messageStoreOperations) {
    const convertedMessageStoreOperations = convertMessageOpsToClientDBOps(
      messageStoreOperations,
    );
    commCoreModule.processMessageStoreOperationsSync(
      convertedMessageStoreOperations,
    );
  }
  return state;
}

export { unshimClientDB, legacyUnshimClientDB };
