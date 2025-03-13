// @flow

import type { DMOperation } from '../types/dm-ops.js';

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

export {
  convertDMOperationIntoClientDBDMOperation,
  convertDMOperationOpsToClientDBOps,
};
