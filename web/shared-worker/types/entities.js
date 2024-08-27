// @flow

import type { ClientDBMessageInfo } from 'lib/types/message-types.js';
import type { ClientDBThreadInfo } from 'lib/types/thread-types.js';

import type { Media, WebMessage } from './sqlite-query-executor.js';

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

function createNullableInt(value: ?string): NullableInt {
  if (value === null || value === undefined) {
    return {
      value: 0,
      isNull: true,
    };
  }
  return {
    value: Number(value),
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

function clientDBMessageInfoToWebMessage(messageInfo: ClientDBMessageInfo): {
  +message: WebMessage,
  +medias: $ReadOnlyArray<Media>,
} {
  return {
    message: {
      id: messageInfo.id,
      localID: createNullableString(messageInfo.local_id),
      thread: messageInfo.thread,
      user: messageInfo.user,
      type: Number(messageInfo.type),
      futureType: createNullableInt(messageInfo.future_type),
      content: createNullableString(messageInfo.content),
      time: messageInfo.time,
    },
    medias:
      messageInfo.media_infos?.map(({ id, uri, type, extras }) => ({
        id,
        uri,
        type,
        extras,
        thread: messageInfo.thread,
        container: messageInfo.id,
      })) ?? [],
  };
}

function webMessageToClientDBMessageInfo({
  message,
  medias,
}: {
  +message: WebMessage,
  +medias: $ReadOnlyArray<Media>,
}): ClientDBMessageInfo {
  let media_infos = null;
  if (medias?.length !== 0) {
    media_infos = medias.map(({ id, uri, type, extras }) => ({
      id,
      uri,
      type,
      extras,
    }));
  }

  return {
    id: message.id,
    local_id: message.localID.isNull ? null : message.localID.value,
    thread: message.thread,
    user: message.user,
    type: message.type.toString(),
    future_type: message.futureType.isNull
      ? null
      : message.futureType.value.toString(),
    content: message.content.isNull ? null : message.content.value,
    time: message.time,
    media_infos,
  };
}

export {
  clientDBThreadInfoToWebThread,
  webThreadToClientDBThreadInfo,
  clientDBMessageInfoToWebMessage,
  webMessageToClientDBMessageInfo,
  createNullableString,
  createNullableInt,
};
