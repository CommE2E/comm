// @flow

import * as React from 'react';

import { DBOpsHandler as BaseHandler } from 'lib/handlers/db-ops-handler.react.js';
import type { StoreOperations } from 'lib/types/store-ops-types.js';

import { useSelector } from '../redux/redux-utils.js';
import { processDBStoreOperations } from '../shared-worker/utils/store.js';

function DBOpsHandler(): React.Node {
  const currentUserID = useSelector(state => state.currentUserInfo?.id ?? null);
  const processOperations = React.useCallback(
    (ops: StoreOperations) => processDBStoreOperations(ops, currentUserID),
    [currentUserID],
  );
  return <BaseHandler processDBStoreOperations={processOperations} />;
}

export { DBOpsHandler };
