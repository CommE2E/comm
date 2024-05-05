// @flow

import {
  type MessageStoreOperation,
  messageStoreOpsHandlers,
} from 'lib/ops/message-store-ops.js';
import { messageID } from 'lib/shared/message-utils.js';
import { unshimFunc } from 'lib/shared/unshim-utils.js';
import { type MessageType } from 'lib/types/message-types-enum.js';
import type {
  RawMessageInfo,
  ClientDBMessageInfo,
} from 'lib/types/message-types.js';
import { translateClientDBMessageInfoToRawMessageInfo } from 'lib/utils/message-ops-utils.js';

import { handleReduxMigrationFailure } from './handle-redux-migration-failure.js';
import type { AppState } from './redux-setup.js';
import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

const {
  processStoreOperations: processMessageStoreOperations,
  convertOpsToClientDBOps: convertMessageOpsToClientDBOps,
} = messageStoreOpsHandlers;

async function unshimClientDB(
  state: AppState,
  unshimTypes: $ReadOnlyArray<MessageType>,
): Promise<AppState> {
  // 1. Check if `databaseModule` is supported and early-exit if not.
  const sharedWorker = await getCommSharedWorker();
  const isDatabaseSupported = await sharedWorker.isSupported();

  if (!isDatabaseSupported) {
    return state;
  }

  // 2. Get existing `stores` from SQLite.
  const stores = await sharedWorker.schedule({
    type: workerRequestMessageTypes.GET_CLIENT_STORE,
  });

  const messages: ?$ReadOnlyArray<ClientDBMessageInfo> =
    stores?.store?.messages;

  if (messages === null || messages === undefined || messages.length === 0) {
    return state;
  }

  // 3. Translate `ClientDBMessageInfo`s to `RawMessageInfo`s.
  const rawMessageInfos = messages.map(
    translateClientDBMessageInfoToRawMessageInfo,
  );

  // 4. "Unshim" translated `RawMessageInfo`s.
  const unshimmedRawMessageInfos = rawMessageInfos.map(messageInfo =>
    unshimFunc(messageInfo, new Set(unshimTypes)),
  );

  // 5. Construct `MessageStoreOperation`s to clear SQLite `messages` table and
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

  // 6. Process the constructed `messageStoreOperations`.
  try {
    const convertedMessageStoreOperations =
      convertMessageOpsToClientDBOps(operations);
    await sharedWorker.schedule({
      type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
      storeOperations: {
        messageStoreOperations: convertedMessageStoreOperations,
      },
    });
    const processedMessageStore = processMessageStoreOperations(
      state.messageStore,
      operations,
    );
    return {
      ...state,
      messageStore: processedMessageStore,
    };
  } catch (e) {
    console.log(e);
    return handleReduxMigrationFailure(state);
  }
}

export { unshimClientDB };
