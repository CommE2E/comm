// @flow

import {
  type QueuedDMOperations,
  queuedDMOperationConditionType,
  type QueueDMOpsCondition,
  type DMOperation,
} from '../types/dm-ops.js';

type Operation = {
  +id: string,
  +type: string,
  +operation: DMOperation,
};

export type ReplaceDMOperationOperation = {
  +type: 'replace_dm_operation',
  +payload: Operation,
};

export type RemoveDMOperationsOperation = {
  +type: 'remove_dm_operations',
  +payload: {
    +ids: $ReadOnlyArray<string>,
  },
};

export type RemoveAllDMOperationsOperation = {
  +type: 'remove_all_dm_operations',
};

export type DMOperationStoreOperation =
  | ReplaceDMOperationOperation
  | RemoveDMOperationsOperation
  | RemoveAllDMOperationsOperation;

export type ClientDBDMOperation = {
  +id: string,
  +type: string,
  +operation: string,
};

export type ClientDBReplaceDMOperationOperation = {
  +type: 'replace_dm_operation',
  +payload: ClientDBDMOperation,
};

export type ClientDBDMOperationStoreOperation =
  | ClientDBReplaceDMOperationOperation
  | RemoveDMOperationsOperation
  | RemoveAllDMOperationsOperation;

function convertDMOperationIntoClientDBDMOperation({
  id,
  type,
  operation,
}: Operation): ClientDBDMOperation {
  return {
    id,
    type,
    operation: JSON.stringify(operation),
  };
}

function convertDMOperationOpsToClientDBOps(
  ops: ?$ReadOnlyArray<DMOperationStoreOperation>,
): $ReadOnlyArray<ClientDBDMOperationStoreOperation> {
  if (!ops) {
    return [];
  }
  return ops.map(operation => {
    if (
      operation.type === 'remove_dm_operations' ||
      operation.type === 'remove_all_dm_operations'
    ) {
      return operation;
    }
    return {
      type: 'replace_dm_operation',
      payload: convertDMOperationIntoClientDBDMOperation(operation.payload),
    };
  });
}

function convertClientDBDMOperationToDMOperation(
  operation: ClientDBDMOperation,
): Operation {
  return {
    id: operation.id,
    type: operation.type,
    operation: JSON.parse(operation.operation),
  };
}

export function addQueuedDMOpsToStore(
  store: QueuedDMOperations,
  condition: QueueDMOpsCondition,
  operation: DMOperation,
  timestamp: number,
): QueuedDMOperations {
  if (condition.type === queuedDMOperationConditionType.THREAD) {
    return {
      ...store,
      threadQueue: {
        ...store.threadQueue,
        [condition.threadID]: [
          ...(store.threadQueue[condition.threadID] ?? []),
          { operation, timestamp },
        ],
      },
    };
  }

  if (condition.type === queuedDMOperationConditionType.ENTRY) {
    return {
      ...store,
      entryQueue: {
        ...store.entryQueue,
        [condition.entryID]: [
          ...(store.entryQueue[condition.entryID] ?? []),
          { operation, timestamp },
        ],
      },
    };
  }

  if (condition.type === queuedDMOperationConditionType.MESSAGE) {
    return {
      ...store,
      messageQueue: {
        ...store.messageQueue,
        [condition.messageID]: [
          ...(store.messageQueue[condition.messageID] ?? []),
          { operation, timestamp },
        ],
      },
    };
  }

  return {
    ...store,
    membershipQueue: {
      ...store.membershipQueue,
      [condition.threadID]: {
        ...(store.membershipQueue[condition.threadID] ?? {}),
        [condition.userID]: [
          ...(store.membershipQueue[condition.threadID]?.[condition.userID] ??
            []),
          { operation, timestamp },
        ],
      },
    },
  };
}

export function removeQueuedDMOpsToStore(
  store: QueuedDMOperations,
  condition: QueueDMOpsCondition,
): QueuedDMOperations {
  if (condition.type === queuedDMOperationConditionType.THREAD) {
    const { [condition.threadID]: removed, ...threadQueue } = store.threadQueue;
    return {
      ...store,
      threadQueue,
    };
  }

  if (condition.type === queuedDMOperationConditionType.ENTRY) {
    const { [condition.entryID]: removed, ...entryQueue } = store.entryQueue;
    return {
      ...store,
      entryQueue,
    };
  }

  if (condition.type === queuedDMOperationConditionType.MESSAGE) {
    const { [condition.messageID]: removed, ...messageQueue } =
      store.messageQueue;
    return {
      ...store,
      messageQueue,
    };
  }

  const threadQueue = store.membershipQueue[condition.threadID];
  if (!threadQueue) {
    return store;
  }

  const { [condition.userID]: removed, ...queue } = threadQueue;
  if (Object.keys(queue).length === 0) {
    const { [condition.threadID]: removedThread, ...membershipQueue } =
      store.membershipQueue;
    return {
      ...store,
      membershipQueue,
    };
  }

  return {
    ...store,
    membershipQueue: {
      ...store.membershipQueue,
      [condition.threadID]: queue,
    },
  };
}

export {
  convertDMOperationIntoClientDBDMOperation,
  convertDMOperationOpsToClientDBOps,
  convertClientDBDMOperationToDMOperation,
};
