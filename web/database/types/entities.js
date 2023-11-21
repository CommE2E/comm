// @flow

import type { ClientDBThreadInfo } from 'lib/types/thread-types.js';

export type Nullable<T> = {
  +value: T,
  +isNull: boolean,
};

export type NullableString = Nullable<string>;

export type NullableInt = Nullable<number>;

export type WebClientDBThreadInfo = {
  +id: string,
  +type: number,
  +name: NullableString,
  +avatar: NullableString,
  +description: NullableString,
  +color: string,
  +creationTime: string,
  +parentThreadID: NullableString,
  +containingThreadID: NullableString,
  +community: NullableString,
  +members: string,
  +roles: string,
  +currentUser: string,
  +sourceMessageID: NullableString,
  +repliesCount: number,
  +pinnedCount: number,
};

function createNullableString(value: ?string): NullableString {
  if (value === null || value === undefined) {
    return {
      value: '',
      isNull: true,
    };
  }
  return {
    value,
    isNull: false,
  };
}

function clientDBThreadInfoToWebThread(
  info: ClientDBThreadInfo,
): WebClientDBThreadInfo {
  return {
    id: info.id,
    type: info.type,
    name: createNullableString(info.name),
    avatar: createNullableString(info.avatar),
    description: createNullableString(info.description),
    color: info.color,
    creationTime: info.creationTime,
    parentThreadID: createNullableString(info.parentThreadID),
    containingThreadID: createNullableString(info.containingThreadID),
    community: createNullableString(info.community),
    members: info.members,
    roles: info.roles,
    currentUser: info.currentUser,
    sourceMessageID: createNullableString(info.sourceMessageID),
    repliesCount: info.repliesCount,
    pinnedCount: info.pinnedCount || 0,
  };
}

function webThreadToClientDBThreadInfo(
  thread: WebClientDBThreadInfo,
): ClientDBThreadInfo {
  let result: ClientDBThreadInfo = {
    id: thread.id,
    type: thread.type,
    name: thread.name.isNull ? null : thread.name.value,
    avatar: thread.avatar.isNull ? null : thread.avatar.value,
    description: thread.description.isNull ? null : thread.description.value,
    color: thread.color,
    creationTime: thread.creationTime,
    parentThreadID: thread.parentThreadID.isNull
      ? null
      : thread.parentThreadID.value,
    containingThreadID: thread.containingThreadID.isNull
      ? null
      : thread.containingThreadID.value,
    community: thread.community.isNull ? null : thread.community.value,
    members: thread.members,
    roles: thread.roles,
    currentUser: thread.currentUser,
    repliesCount: thread.repliesCount,
    pinnedCount: thread.pinnedCount,
  };
  if (!thread.sourceMessageID.isNull) {
    result = {
      ...result,
      sourceMessageID: thread.sourceMessageID.value,
    };
  }
  return result;
}

export { clientDBThreadInfoToWebThread, webThreadToClientDBThreadInfo };
