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
    avatar: rawThreadInfo.avatar ? JSON.stringify(rawThreadInfo.avatar) : null,
  };
}

function convertClientDBThreadInfoToRawThreadInfo(
  clientDBThreadInfo: ClientDBThreadInfo,
): RawThreadInfo {
  let rawThreadInfo: RawThreadInfo = {
    id: clientDBThreadInfo.id,
    type: assertThreadType(clientDBThreadInfo.type),
    name: clientDBThreadInfo.name,
    description: clientDBThreadInfo.description,
    color: clientDBThreadInfo.color,
    creationTime: Number(clientDBThreadInfo.creationTime),
    parentThreadID: clientDBThreadInfo.parentThreadID,
    containingThreadID: clientDBThreadInfo.containingThreadID,
    community: clientDBThreadInfo.community,
    members: JSON.parse(clientDBThreadInfo.members),
    roles: JSON.parse(clientDBThreadInfo.roles),
    currentUser: JSON.parse(clientDBThreadInfo.currentUser),
    repliesCount: clientDBThreadInfo.repliesCount,
  };

  if (clientDBThreadInfo.sourceMessageID) {
    rawThreadInfo = {
      ...rawThreadInfo,
      sourceMessageID: clientDBThreadInfo.sourceMessageID,
    };
  }

  if (clientDBThreadInfo.avatar) {
    rawThreadInfo = {
      ...rawThreadInfo,
      avatar: JSON.parse(clientDBThreadInfo.avatar),
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
