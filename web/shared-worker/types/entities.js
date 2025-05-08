// @flow

import type { ClientDBMessageInfo } from 'lib/types/message-types.js';
import type { ClientDBThreadInfo } from 'lib/types/thread-types.js';

import type { Media, WebMessage } from './sqlite-query-executor.js';

export type WebClientDBThreadInfo = {
  +id: string,
  +type: number,
  +name: ?string,
  +avatar: ?string,
  +description: ?string,
  +color: string,
  +creationTime: bigint,
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: string,
  +roles: string,
  +currentUser: string,
  +sourceMessageID: ?string,
  +repliesCount: number,
  +pinnedCount: number,
  +timestamps: ?string,
};

function clientDBThreadInfoToWebThread(
  info: ClientDBThreadInfo,
): WebClientDBThreadInfo {
  return {
    id: info.id,
    type: info.type,
    name: info.name,
    avatar: info.avatar,
    description: info.description,
    color: info.color,
    creationTime: BigInt(Number(info.creationTime)),
    parentThreadID: info.parentThreadID,
    containingThreadID: info.containingThreadID,
    community: info.community,
    members: info.members,
    roles: info.roles,
    currentUser: info.currentUser,
    sourceMessageID: info.sourceMessageID,
    repliesCount: info.repliesCount,
    pinnedCount: info.pinnedCount || 0,
    timestamps: info.timestamps,
  };
}

function webThreadToClientDBThreadInfo(
  thread: WebClientDBThreadInfo,
): ClientDBThreadInfo {
  let result: ClientDBThreadInfo = {
    id: thread.id,
    type: thread.type,
    name: thread.name,
    avatar: thread.avatar,
    description: thread.description,
    color: thread.color,
    creationTime: thread.creationTime.toString(),
    parentThreadID: thread.parentThreadID,
    containingThreadID: thread.containingThreadID,
    community: thread.community,
    members: thread.members,
    roles: thread.roles,
    currentUser: thread.currentUser,
    repliesCount: thread.repliesCount,
    pinnedCount: thread.pinnedCount,
    timestamps: thread.timestamps,
  };
  if (thread.sourceMessageID) {
    result = {
      ...result,
      sourceMessageID: thread.sourceMessageID,
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
      localID: messageInfo.local_id,
      thread: messageInfo.thread,
      user: messageInfo.user,
      type: Number(messageInfo.type),
      futureType: messageInfo.future_type
        ? Number(messageInfo.future_type)
        : null,
      content: messageInfo.content,
      time: BigInt(Number(messageInfo.time)),
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
    local_id: message.localID,
    thread: message.thread,
    user: message.user,
    type: message.type.toString(),
    future_type: message.futureType ? message.futureType.toString() : null,
    content: message.content,
    time: message.time.toString(),
    media_infos,
  };
}

export {
  clientDBThreadInfoToWebThread,
  webThreadToClientDBThreadInfo,
  clientDBMessageInfoToWebMessage,
  webMessageToClientDBMessageInfo,
};
