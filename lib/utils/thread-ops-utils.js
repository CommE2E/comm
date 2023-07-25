// @flow

import { assertThreadType } from '../types/thread-types-enum.js';
import {
  type ClientDBThreadInfo,
  type RawThreadInfo,
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
    pinnedCount: clientDBThreadInfo.pinnedCount,
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

export {
  convertRawThreadInfoToClientDBThreadInfo,
  convertClientDBThreadInfoToRawThreadInfo,
};
