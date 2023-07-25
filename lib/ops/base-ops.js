// @flow

export type BaseStoreOperations<
  Store,
  Operation,
  ClientDBOperation,
  DataType,
  ClientDBDataType,
> = {
  processStoreOperations: (
    store: Store,
    ops: $ReadOnlyArray<Operation>,
  ) => Store,
  convertOpsToClientDBOps: (
    ops: $ReadOnlyArray<Operation>,
  ) => $ReadOnlyArray<ClientDBOperation>,
  translateClientDBData: (data: $ReadOnlyArray<ClientDBDataType>) => DataType,
};
