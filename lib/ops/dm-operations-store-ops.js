// @flow

import _mapValues from 'lodash/fp/mapValues.js';

import type { BaseStoreOpsHandlers } from './base-ops.js';
import {
  type QueuedDMOperations,
  queuedDMOperationConditionType,
  type QueueDMOpsCondition,
  type DMOperation,
  type QueueDMOpsPayload,
  type QueuedDMOperationCondition,
  type PruneDMOpsQueuePayload,
  assertQueuedDMOperationCondition,
  type OperationsQueue,
} from '../types/dm-ops.js';

// Shimmed DM Operations ops
export type DMOperationEntity = {
  +id: string,
  +type: string,
  +operation: DMOperation,
};

export type ReplaceDMOperationOperation = {
  +type: 'replace_dm_operation',
  +payload: DMOperationEntity,
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

// Queued DM Operations ops
export type AddQueuedDMOperationOperation = {
  +type: 'add_queued_dm_operation',
  +payload: QueueDMOpsPayload,
};

export type ClearDMOperationsQueueOperation = {
  +type: 'clear_dm_operations_queue',
  +payload: {
    +condition: QueueDMOpsCondition,
  },
};

export type PruneQueuedDMOperationsOperation = {
  +type: 'prune_queued_dm_operations',
  +payload: PruneDMOpsQueuePayload,
};

export type DMOperationStoreOperation =
  | ReplaceDMOperationOperation
  | RemoveDMOperationsOperation
  | RemoveAllDMOperationsOperation
  | AddQueuedDMOperationOperation
  | ClearDMOperationsQueueOperation
  | PruneQueuedDMOperationsOperation;

// Shimmed DM Operations DB ops
export type ClientDBDMOperation = {
  +id: string,
  +type: string,
  +operation: string,
};

export type ClientDBReplaceDMOperationOperation = {
  +type: 'replace_dm_operation',
  +payload: ClientDBDMOperation,
};

// Queued DM Operations DB ops
export type ClientDBQueuedDMOperation = {
  +queueType: string,
  +queueKey: string,
  +operationData: string,
  +timestamp: string,
};

export type ClientDBAddQueuedDMOperationOperation = {
  +type: 'add_queued_dm_operation',
  +payload: {
    +queueType: QueuedDMOperationCondition,
    +queueKey: string,
    +operationData: string,
    +timestamp: string,
  },
};

export type ClientDBClearDMOperationsQueueOperation = {
  +type: 'clear_dm_operations_queue',
  +payload: {
    +queueType: QueuedDMOperationCondition,
    +queueKey: string,
  },
};

export type ClientDBPruneQueuedDMOperationsOperation = {
  +type: 'prune_queued_dm_operations',
  +payload: {
    +timestamp: string,
  },
};

export type ClientDBDMOperationStoreOperation =
  | ClientDBReplaceDMOperationOperation
  | RemoveDMOperationsOperation
  | RemoveAllDMOperationsOperation
  | ClientDBAddQueuedDMOperationOperation
  | ClientDBClearDMOperationsQueueOperation
  | ClientDBPruneQueuedDMOperationsOperation;

function convertDMOperationIntoClientDBDMOperation({
  id,
  type,
  operation,
}: DMOperationEntity): ClientDBDMOperation {
  return {
    id,
    type,
    operation: JSON.stringify(operation),
  };
}

function convertClientDBDMOperationToDMOperation(
  operation: ClientDBDMOperation,
): DMOperationEntity {
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

function getQueueKeyFromCondition(condition: QueueDMOpsCondition): string {
  if (condition.type === queuedDMOperationConditionType.THREAD) {
    return condition.threadID;
  }
  if (condition.type === queuedDMOperationConditionType.ENTRY) {
    return condition.entryID;
  }
  if (condition.type === queuedDMOperationConditionType.MESSAGE) {
    return condition.messageID;
  }
  return `${condition.threadID}#${condition.userID}`;
}

export const dmOperationsStoreOpsHandlers: BaseStoreOpsHandlers<
  QueuedDMOperations,
  DMOperationStoreOperation,
  ClientDBDMOperationStoreOperation,
  QueuedDMOperations,
  ClientDBQueuedDMOperation,
> = {
  processStoreOperations(
    store: QueuedDMOperations,
    ops: $ReadOnlyArray<DMOperationStoreOperation>,
  ): QueuedDMOperations {
    if (ops.length === 0) {
      return store;
    }

    let processedStore: QueuedDMOperations = { ...store };

    for (const op of ops) {
      if (op.type === 'add_queued_dm_operation') {
        const { condition, operation, timestamp } = op.payload;
        processedStore = addQueuedDMOpsToStore(
          processedStore,
          condition,
          operation,
          timestamp,
        );
      } else if (op.type === 'clear_dm_operations_queue') {
        const { condition } = op.payload;
        processedStore = removeQueuedDMOpsToStore(processedStore, condition);
      } else if (op.type === 'prune_queued_dm_operations') {
        const filterOperations = (queue: OperationsQueue) =>
          queue.filter(item => item.timestamp >= op.payload.pruneMaxTimestamp);
        processedStore = {
          ...processedStore,
          threadQueue: _mapValues(operations => filterOperations(operations))(
            store.threadQueue,
          ),
          messageQueue: _mapValues(operations => filterOperations(operations))(
            store.messageQueue,
          ),
          entryQueue: _mapValues(operations => filterOperations(operations))(
            store.entryQueue,
          ),
          membershipQueue: _mapValues(threadMembershipQueue =>
            _mapValues(operations => filterOperations(operations))(
              threadMembershipQueue,
            ),
          )(store.membershipQueue),
        };
      } else if (op.type === 'remove_dm_operations') {
        processedStore = {
          ...processedStore,
          shimmedOperations: store.shimmedOperations.filter(
            item => !op.payload.ids.includes(item.id),
          ),
        };
      }
    }

    return processedStore;
  },

  convertOpsToClientDBOps(
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
      } else if (operation.type === 'replace_dm_operation') {
        return {
          type: 'replace_dm_operation',
          payload: convertDMOperationIntoClientDBDMOperation(operation.payload),
        };
      } else if (operation.type === 'add_queued_dm_operation') {
        const {
          operation: dmOperation,
          timestamp,
          condition,
        } = operation.payload;

        return {
          type: 'add_queued_dm_operation',
          payload: {
            queueType: condition.type,
            queueKey: getQueueKeyFromCondition(condition),
            operationData: JSON.stringify(dmOperation),
            timestamp: timestamp.toString(),
          },
        };
      } else if (operation.type === 'prune_queued_dm_operations') {
        return {
          type: 'prune_queued_dm_operations',
          payload: {
            timestamp: operation.payload.pruneMaxTimestamp.toString(),
          },
        };
      } else {
        const { condition } = operation.payload;

        return {
          type: 'clear_dm_operations_queue',
          payload: {
            queueType: condition.type,
            queueKey: getQueueKeyFromCondition(condition),
          },
        };
      }
    });
  },

  translateClientDBData(
    data: $ReadOnlyArray<ClientDBQueuedDMOperation>,
  ): QueuedDMOperations {
    let processedStore: QueuedDMOperations = {
      threadQueue: {},
      messageQueue: {},
      entryQueue: {},
      membershipQueue: {},
      shimmedOperations: [],
    };

    data.forEach((item: ClientDBQueuedDMOperation) => {
      const { queueType, queueKey, operationData, timestamp } = item;
      const conditionType = assertQueuedDMOperationCondition(queueType);
      let condition: QueueDMOpsCondition;

      if (conditionType === queuedDMOperationConditionType.THREAD) {
        condition = {
          type: queuedDMOperationConditionType.THREAD,
          threadID: queueKey,
        };
      } else if (conditionType === queuedDMOperationConditionType.ENTRY) {
        condition = {
          type: queuedDMOperationConditionType.ENTRY,
          entryID: queueKey,
        };
      } else if (conditionType === queuedDMOperationConditionType.MESSAGE) {
        condition = {
          type: queuedDMOperationConditionType.MESSAGE,
          messageID: queueKey,
        };
      } else {
        const [threadID, userID] = queueKey.split('#');
        condition = {
          type: queuedDMOperationConditionType.MEMBERSHIP,
          threadID,
          userID,
        };
      }

      processedStore = addQueuedDMOpsToStore(
        processedStore,
        condition,
        JSON.parse(operationData),
        parseInt(timestamp, 10),
      );
    });

    return processedStore;
  },
};

export {
  convertDMOperationIntoClientDBDMOperation,
  convertClientDBDMOperationToDMOperation,
};
