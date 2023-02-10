// @flow

import {
  type ClientDBThreadInfo,
  type ThreadStoreOperation,
  type ClientDBThreadStoreOperation,
  type RawThreadInfo,
  assertThreadType,
} from '../types/thread-types.js';

function convertRawThreadInfoToClientDBThreadInfo(
  rawThreadInfo: RawThreadInfo,
): ClientDBThreadInfo {
  return {
    ...rawThreadInfo,
    creationTime: rawThreadInfo.creationTime.toString(),
    members: JSON.stringify(rawThreadInfo.members),
    roles: JSON.stringify(rawThreadInfo.roles),
    currentUser: JSON.stringify(rawThreadInfo.currentUser),
  };
}

function convertClientDBThreadInfoToRawThreadInfo(
  clientDBThreadInfo: ClientDBThreadInfo,
): RawThreadInfo {
  const { sourceMessageID, ...rawThreadInfo }: RawThreadInfo = {
    ...clientDBThreadInfo,
    type: assertThreadType(clientDBThreadInfo.type),
    creationTime: Number(clientDBThreadInfo.creationTime),
    members: JSON.parse(clientDBThreadInfo.members),
    roles: JSON.parse(clientDBThreadInfo.roles),
    currentUser: JSON.parse(clientDBThreadInfo.currentUser),
  };
  if (clientDBThreadInfo.sourceMessageID) {
    return {
      ...rawThreadInfo,
      sourceMessageID: clientDBThreadInfo.sourceMessageID,
    };
  }
  return rawThreadInfo;
}

function convertThreadStoreOperationsToClientDBOperations(
  threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
): $ReadOnlyArray<ClientDBThreadStoreOperation> {
  return threadStoreOperations.map(threadStoreOperation => {
    if (threadStoreOperation.type === 'replace') {
      return {
        type: 'replace',
        payload: convertRawThreadInfoToClientDBThreadInfo(
          threadStoreOperation.payload.threadInfo,
        ),
      };
    }
    return threadStoreOperation;
  });
}

function convertClientDBThreadInfosToRawThreadInfos(
  clientDBThreadInfos: $ReadOnlyArray<ClientDBThreadInfo>,
): { +[id: string]: RawThreadInfo } {
  return Object.fromEntries(
    clientDBThreadInfos.map((dbThreadInfo: ClientDBThreadInfo) => [
      dbThreadInfo.id,
      convertClientDBThreadInfoToRawThreadInfo(dbThreadInfo),
    ]),
  );
}

export {
  convertRawThreadInfoToClientDBThreadInfo,
  convertClientDBThreadInfoToRawThreadInfo,
  convertThreadStoreOperationsToClientDBOperations,
  convertClientDBThreadInfosToRawThreadInfos,
};
