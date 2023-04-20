// @flow

import { unshimFunc } from 'lib/shared/unshim-utils.js';
import { type MessageType } from 'lib/types/message-types-enum.js';
import type {
  ClientDBMessageStoreOperation,
  ClientDBMessageInfo,
} from 'lib/types/message-types.js';
import {
  translateClientDBMessageInfoToRawMessageInfo,
  translateRawMessageInfoToClientDBMessageInfo,
} from 'lib/utils/message-ops-utils.js';

import type { AppState } from './state-types.js';
import { commCoreModule } from '../native-modules.js';

function unshimClientDB(
  state: AppState,
  unshimTypes: $ReadOnlyArray<MessageType>,
): AppState {
  // 1. Get messages from SQLite `messages` table.
  const clientDBMessageInfos = commCoreModule.getAllMessagesSync();

  // 2. Translate `ClientDBMessageInfo`s to `RawMessageInfo`s.
  const rawMessageInfos = clientDBMessageInfos.map(
    translateClientDBMessageInfoToRawMessageInfo,
  );

  // 3. "Unshim" translated `RawMessageInfo`s.
  const unshimmedRawMessageInfos = rawMessageInfos.map(messageInfo =>
    unshimFunc(messageInfo, new Set(unshimTypes)),
  );

  // 4. Translate unshimmed `RawMessageInfo`s back to `ClientDBMessageInfo`s.
  const unshimmedClientDBMessageInfos = unshimmedRawMessageInfos.map(
    translateRawMessageInfoToClientDBMessageInfo,
  );

  // 5. Construct `ClientDBMessageStoreOperation`s to clear SQLite `messages`
  //    table and repopulate with unshimmed `ClientDBMessageInfo`s.
  const operations: $ReadOnlyArray<ClientDBMessageStoreOperation> = [
    {
      type: 'remove_all',
    },
    ...unshimmedClientDBMessageInfos.map((message: ClientDBMessageInfo) => ({
      type: 'replace',
      payload: message,
    })),
  ];

  // 6. Try processing `ClientDBMessageStoreOperation`s and log out if
  //    `processMessageStoreOperationsSync(...)` throws an exception.
  try {
    commCoreModule.processMessageStoreOperationsSync(operations);
  } catch (exception) {
    console.log(exception);
    return { ...state, cookie: null };
  }

  return state;
}

export { unshimClientDB };
