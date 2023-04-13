// @flow

import { useSelector as reactReduxUseSelector } from 'react-redux';

import type { StoreOperations } from 'lib/types/store-ops-types.js';
import { convertMessageStoreOperationsToClientDBOperations } from 'lib/utils/message-ops-utils.js';
import { convertThreadStoreOperationsToClientDBOperations } from 'lib/utils/thread-ops-utils.js';

import type { AppState } from './state-types.js';
import { commCoreModule } from '../native-modules.js';
import { isTaskCancelledError } from '../utils/error-handling.js';

function useSelector<SS>(
  selector: (state: AppState) => SS,
  equalityFn?: (a: SS, b: SS) => boolean,
): SS {
  return reactReduxUseSelector(selector, equalityFn);
}

async function processDBStoreOperations(
  storeOperations: StoreOperations,
): Promise<void> {
  const {
    draftStoreOperations,
    threadStoreOperations,
    messageStoreOperations,
  } = storeOperations;

  const convertedThreadStoreOperations =
    convertThreadStoreOperationsToClientDBOperations(threadStoreOperations);
  const convertedMessageStoreOperations =
    convertMessageStoreOperationsToClientDBOperations(messageStoreOperations);

  try {
    const promises = [];
    if (convertedThreadStoreOperations.length > 0) {
      promises.push(
        commCoreModule.processThreadStoreOperations(
          convertedThreadStoreOperations,
        ),
      );
    }
    if (convertedMessageStoreOperations.length > 0) {
      promises.push(
        commCoreModule.processMessageStoreOperations(
          convertedMessageStoreOperations,
        ),
      );
    }
    if (draftStoreOperations.length > 0) {
      promises.push(
        commCoreModule.processDraftStoreOperations(draftStoreOperations),
      );
    }
    await Promise.all(promises);
  } catch (e) {
    if (isTaskCancelledError(e)) {
      return;
    }
    // this code will make an entry in SecureStore and cause re-creating
    // database when user will open app again
    commCoreModule.reportDBOperationsFailure();
    commCoreModule.terminate();
  }
}

export { useSelector, processDBStoreOperations };
