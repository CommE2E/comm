// @flow

import invariant from 'invariant';
import t, { type TInterface, type TUnion, type TEnums } from 'tcomb';

import type { FetchResultInfoInterface } from '../utils/fetch-json';
import { values } from '../utils/objects';
import { tID, tShape, tNumber } from '../utils/validation-utils';
import { type ClientDBMediaInfo } from './media-types';
import {
  type AddMembersMessageData,
  type AddMembersMessageInfo,
  type RawAddMembersMessageInfo,
  rawAddMembersMessageInfoValidator,
} from './messages/add-members';
import {
  type ChangeRoleMessageData,
  type ChangeRoleMessageInfo,
  type RawChangeRoleMessageInfo,
  rawChangeRoleMessageInfoValidator,
} from './messages/change-role';
import {
  type ChangeSettingsMessageData,
  type ChangeSettingsMessageInfo,
  type RawChangeSettingsMessageInfo,
  rawChangeSettingsMessageInfoValidator,
} from './messages/change-settings';
import {
  type CreateEntryMessageData,
  type CreateEntryMessageInfo,
  type RawCreateEntryMessageInfo,
  rawCreateEntryMessageInfoValidator,
} from './messages/create-entry';
import {
  type CreateSidebarMessageData,
  type CreateSidebarMessageInfo,
  type RawCreateSidebarMessageInfo,
  rawCreateSidebarMessageInfoValidator,
} from './messages/create-sidebar';
import {
  type CreateSubthreadMessageData,
  type CreateSubthreadMessageInfo,
  type RawCreateSubthreadMessageInfo,
  rawCreateSubthreadMessageInfoValidator,
} from './messages/create-subthread';
import {
  type CreateThreadMessageData,
  type CreateThreadMessageInfo,
  type RawCreateThreadMessageInfo,
  rawCreateThreadMessageInfoValidator,
} from './messages/create-thread';
import {
  type DeleteEntryMessageData,
  type DeleteEntryMessageInfo,
  type RawDeleteEntryMessageInfo,
  rawDeleteEntryMessageInfoValidator,
} from './messages/delete-entry';
import {
  type EditEntryMessageData,
  type EditEntryMessageInfo,
  type RawEditEntryMessageInfo,
  rawEditEntryMessageInfoValidator,
} from './messages/edit-entry';
import {
  type ImagesMessageData,
  type ImagesMessageInfo,
  type RawImagesMessageInfo,
  rawImagesMessageInfoValidator,
} from './messages/images';
import {
  type JoinThreadMessageData,
  type JoinThreadMessageInfo,
  type RawJoinThreadMessageInfo,
  rawJoinThreadMessageInfoValidator,
} from './messages/join-thread';
import {
  type LeaveThreadMessageData,
  type LeaveThreadMessageInfo,
  type RawLeaveThreadMessageInfo,
  rawLeaveThreadMessageInfoValidator,
} from './messages/leave-thread';
import {
  type MediaMessageData,
  type MediaMessageInfo,
  type RawMediaMessageInfo,
  rawMediaMessageInfoValidator,
} from './messages/media';
import {
  type RawRemoveMembersMessageInfo,
  type RemoveMembersMessageData,
  type RemoveMembersMessageInfo,
  rawRemoveMembersMessageInfoValidator,
} from './messages/remove-members';
import {
  type RawRestoreEntryMessageInfo,
  type RestoreEntryMessageData,
  type RestoreEntryMessageInfo,
  rawRestoreEntryMessageInfoValidator,
} from './messages/restore-entry';
import {
  type RawTextMessageInfo,
  type TextMessageData,
  type TextMessageInfo,
  rawTextMessageInfoValidator,
} from './messages/text';
import {
  type RawUnsupportedMessageInfo,
  type UnsupportedMessageInfo,
  rawUnsupportedMessageInfoValidator,
} from './messages/unsupported';
import {
  type RawUpdateRelationshipMessageInfo,
  type UpdateRelationshipMessageData,
  type UpdateRelationshipMessageInfo,
  rawUpdateRelationshipMessageInfoValidator,
} from './messages/update-relationship';
import { type RelativeUserInfo, type UserInfos } from './user-types';

export const messageTypes = Object.freeze({
  TEXT: 0,
  CREATE_THREAD: 1,
  ADD_MEMBERS: 2,
  CREATE_SUB_THREAD: 3,
  CHANGE_SETTINGS: 4,
  REMOVE_MEMBERS: 5,
  CHANGE_ROLE: 6,
  LEAVE_THREAD: 7,
  JOIN_THREAD: 8,
  CREATE_ENTRY: 9,
  EDIT_ENTRY: 10,
  DELETE_ENTRY: 11,
  RESTORE_ENTRY: 12,
  // When the server has a message to deliver that the client can't properly
  // render because the client is too old, the server will send this message
  // type instead. Consequently, there is no MessageData for UNSUPPORTED - just
  // a RawMessageInfo and a MessageInfo. Note that native/persist.js handles
  // converting these MessageInfos when the client is upgraded.
  UNSUPPORTED: 13,
  IMAGES: 14,
  MULTIMEDIA: 15,
  UPDATE_RELATIONSHIP: 16,
  SIDEBAR_SOURCE: 17,
  CREATE_SIDEBAR: 18,
});
export type MessageType = $Values<typeof messageTypes>;
export function assertMessageType(ourMessageType: number): MessageType {
  invariant(
    ourMessageType === 0 ||
      ourMessageType === 1 ||
      ourMessageType === 2 ||
      ourMessageType === 3 ||
      ourMessageType === 4 ||
      ourMessageType === 5 ||
      ourMessageType === 6 ||
      ourMessageType === 7 ||
      ourMessageType === 8 ||
      ourMessageType === 9 ||
      ourMessageType === 10 ||
      ourMessageType === 11 ||
      ourMessageType === 12 ||
      ourMessageType === 13 ||
      ourMessageType === 14 ||
      ourMessageType === 15 ||
      ourMessageType === 16 ||
      ourMessageType === 17 ||
      ourMessageType === 18,
    'number is not MessageType enum',
  );
  return ourMessageType;
}

const composableMessageTypes = new Set([
  messageTypes.TEXT,
  messageTypes.IMAGES,
  messageTypes.MULTIMEDIA,
]);
export function isComposableMessageType(ourMessageType: MessageType): boolean {
  return composableMessageTypes.has(ourMessageType);
}
export function assertComposableMessageType(
  ourMessageType: MessageType,
): MessageType {
  invariant(
    isComposableMessageType(ourMessageType),
    'MessageType is not composed',
  );
  return ourMessageType;
}
export function assertComposableRawMessage(
  message: RawMessageInfo,
): RawComposableMessageInfo {
  invariant(
    message.type === messageTypes.TEXT ||
      message.type === messageTypes.IMAGES ||
      message.type === messageTypes.MULTIMEDIA,
    'Message is not composable',
  );
  return message;
}
export function messageDataLocalID(messageData: MessageData): ?string {
  if (
    messageData.type !== messageTypes.TEXT &&
    messageData.type !== messageTypes.IMAGES &&
    messageData.type !== messageTypes.MULTIMEDIA
  ) {
    return null;
  }
  return messageData.localID;
}

const mediaMessageTypes = new Set([
  messageTypes.IMAGES,
  messageTypes.MULTIMEDIA,
]);
export function isMediaMessageType(ourMessageType: MessageType): boolean {
  return mediaMessageTypes.has(ourMessageType);
}
export function assetMediaMessageType(
  ourMessageType: MessageType,
): MessageType {
  invariant(isMediaMessageType(ourMessageType), 'MessageType is not media');
  return ourMessageType;
}

// *MessageData = passed to createMessages function to insert into database
// Raw*MessageInfo = used by server, and contained in client's local store
// *MessageInfo = used by client in UI code

export type SidebarSourceMessageData = {
  +type: 17,
  +threadID: string,
  +creatorID: string,
  +time: number,
  +sourceMessage?: RawComposableMessageInfo | RawRobotextMessageInfo,
};
export type MessageData =
  | TextMessageData
  | CreateThreadMessageData
  | AddMembersMessageData
  | CreateSubthreadMessageData
  | ChangeSettingsMessageData
  | RemoveMembersMessageData
  | ChangeRoleMessageData
  | LeaveThreadMessageData
  | JoinThreadMessageData
  | CreateEntryMessageData
  | EditEntryMessageData
  | DeleteEntryMessageData
  | RestoreEntryMessageData
  | ImagesMessageData
  | MediaMessageData
  | UpdateRelationshipMessageData
  | SidebarSourceMessageData
  | CreateSidebarMessageData;

export type MultimediaMessageData = ImagesMessageData | MediaMessageData;

export type RawMultimediaMessageInfo =
  | RawImagesMessageInfo
  | RawMediaMessageInfo;
const rawMultimediaMessageInfoValidator = t.union([
  rawImagesMessageInfoValidator,
  rawMediaMessageInfoValidator,
]);

export type RawComposableMessageInfo =
  | RawTextMessageInfo
  | RawMultimediaMessageInfo;
const rawComposableMessageInfoValidator = t.union([
  rawTextMessageInfoValidator,
  rawMultimediaMessageInfoValidator,
]);

export type RawRobotextMessageInfo =
  | RawCreateThreadMessageInfo
  | RawAddMembersMessageInfo
  | RawCreateSubthreadMessageInfo
  | RawChangeSettingsMessageInfo
  | RawRemoveMembersMessageInfo
  | RawChangeRoleMessageInfo
  | RawLeaveThreadMessageInfo
  | RawJoinThreadMessageInfo
  | RawCreateEntryMessageInfo
  | RawEditEntryMessageInfo
  | RawDeleteEntryMessageInfo
  | RawRestoreEntryMessageInfo
  | RawUpdateRelationshipMessageInfo
  | RawCreateSidebarMessageInfo
  | RawUnsupportedMessageInfo;

const rawRobotextMessageInfoValidator = t.union([
  rawCreateThreadMessageInfoValidator,
  rawAddMembersMessageInfoValidator,
  rawCreateSubthreadMessageInfoValidator,
  rawChangeSettingsMessageInfoValidator,
  rawRemoveMembersMessageInfoValidator,
  rawChangeRoleMessageInfoValidator,
  rawLeaveThreadMessageInfoValidator,
  rawJoinThreadMessageInfoValidator,
  rawCreateEntryMessageInfoValidator,
  rawEditEntryMessageInfoValidator,
  rawDeleteEntryMessageInfoValidator,
  rawRestoreEntryMessageInfoValidator,
  rawUpdateRelationshipMessageInfoValidator,
  rawCreateSidebarMessageInfoValidator,
  rawUnsupportedMessageInfoValidator,
]);

export type RawSidebarSourceMessageInfo = {
  ...SidebarSourceMessageData,
  id: string,
};
export const rawSidebarSourceMessageInfoValidator: TInterface = tShape({
  type: tNumber(17),
  id: t.String,
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  sourceMessage: t.maybe(
    t.union([
      rawComposableMessageInfoValidator,
      rawRobotextMessageInfoValidator,
    ]),
  ),
});

export type RawMessageInfo =
  | RawComposableMessageInfo
  | RawRobotextMessageInfo
  | RawSidebarSourceMessageInfo;

export const rawMessageInfoValidator: TUnion<TInterface> = t.union([
  rawComposableMessageInfoValidator,
  rawRobotextMessageInfoValidator,
  rawSidebarSourceMessageInfoValidator,
]);

export type LocallyComposedMessageInfo =
  | ({
      ...RawImagesMessageInfo,
      +localID: string,
    } & RawImagesMessageInfo)
  | ({
      ...RawMediaMessageInfo,
      +localID: string,
    } & RawMediaMessageInfo)
  | ({
      ...RawTextMessageInfo,
      +localID: string,
    } & RawTextMessageInfo);

export type MultimediaMessageInfo = ImagesMessageInfo | MediaMessageInfo;
export type ComposableMessageInfo = TextMessageInfo | MultimediaMessageInfo;

export type RobotextMessageInfo =
  | CreateThreadMessageInfo
  | AddMembersMessageInfo
  | CreateSubthreadMessageInfo
  | ChangeSettingsMessageInfo
  | RemoveMembersMessageInfo
  | ChangeRoleMessageInfo
  | LeaveThreadMessageInfo
  | JoinThreadMessageInfo
  | CreateEntryMessageInfo
  | EditEntryMessageInfo
  | DeleteEntryMessageInfo
  | RestoreEntryMessageInfo
  | UnsupportedMessageInfo
  | UpdateRelationshipMessageInfo
  | CreateSidebarMessageInfo;
export type PreviewableMessageInfo =
  | RobotextMessageInfo
  | MultimediaMessageInfo;
export type SidebarSourceMessageInfo = {
  +type: 17,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number,
  +sourceMessage: ComposableMessageInfo | RobotextMessageInfo,
};

export type MessageInfo =
  | ComposableMessageInfo
  | RobotextMessageInfo
  | SidebarSourceMessageInfo;

export type ThreadMessageInfo = {
  messageIDs: string[],
  startReached: boolean,
  lastNavigatedTo: number, // millisecond timestamp
  lastPruned: number, // millisecond timestamp
};

// Tracks client-local information about a message that hasn't been assigned an
// ID by the server yet. As soon as the client gets an ack from the server for
// this message, it will clear the LocalMessageInfo.
export type LocalMessageInfo = {
  +sendFailed?: boolean,
};

export type MessageStore = {
  +messages: { +[id: string]: RawMessageInfo },
  +threads: { +[threadID: string]: ThreadMessageInfo },
  +local: { +[id: string]: LocalMessageInfo },
  +currentAsOf: number,
};

export type RemoveMessageOperation = {
  +type: 'remove',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveMessagesForThreadsOperation = {
  +type: 'remove_messages_for_threads',
  +payload: { +threadIDs: $ReadOnlyArray<string> },
};

export type ReplaceMessageOperation = {
  +type: 'replace',
  +payload: { +id: string, +messageInfo: RawMessageInfo },
};

export type RekeyMessageOperation = {
  +type: 'rekey',
  +payload: { +from: string, +to: string },
};

export type RemoveAllMessagesOperation = {
  +type: 'remove_all',
};

export type ClientDBMessageInfo = {
  +id: string,
  +local_id: ?string,
  +thread: string,
  +user: string,
  +type: string,
  +future_type: ?string,
  +content: ?string,
  +time: string,
  +media_infos: ?$ReadOnlyArray<ClientDBMediaInfo>,
};

export type ClientDBReplaceMessageOperation = {
  +type: 'replace',
  +payload: ClientDBMessageInfo,
};

export type MessageStoreOperation =
  | RemoveMessageOperation
  | ReplaceMessageOperation
  | RekeyMessageOperation
  | RemoveMessagesForThreadsOperation
  | RemoveAllMessagesOperation;

export type ClientDBMessageStoreOperation =
  | RemoveMessageOperation
  | ClientDBReplaceMessageOperation
  | RekeyMessageOperation
  | RemoveMessagesForThreadsOperation
  | RemoveAllMessagesOperation;

export const messageTruncationStatus = Object.freeze({
  // EXHAUSTIVE means we've reached the start of the thread. Either the result
  // set includes the very first message for that thread, or there is nothing
  // behind the cursor you queried for. Given that the client only ever issues
  // ranged queries whose range, when unioned with what is in state, represent
  // the set of all messages for a given thread, we can guarantee that getting
  // EXHAUSTIVE means the start has been reached.
  EXHAUSTIVE: 'exhaustive',
  // TRUNCATED is rare, and means that the server can't guarantee that the
  // result set for a given thread is contiguous with what the client has in its
  // state. If the client can't verify the contiguousness itself, it needs to
  // replace its Redux store's contents with what it is in this payload.
  //  1) getMessageInfosSince: Result set for thread is equal to max, and the
  //     truncation status isn't EXHAUSTIVE (ie. doesn't include the very first
  //     message).
  //  2) getMessageInfos: ThreadSelectionCriteria does not specify cursors, the
  //     result set for thread is equal to max, and the truncation status isn't
  //     EXHAUSTIVE. If cursors are specified, we never return truncated, since
  //     the cursor given us guarantees the contiguousness of the result set.
  // Note that in the reducer, we can guarantee contiguousness if there is any
  // intersection between messageIDs in the result set and the set currently in
  // the Redux store.
  TRUNCATED: 'truncated',
  // UNCHANGED means the result set is guaranteed to be contiguous with what the
  // client has in its state, but is not EXHAUSTIVE. Basically, it's anything
  // that isn't either EXHAUSTIVE or TRUNCATED.
  UNCHANGED: 'unchanged',
});
export type MessageTruncationStatus = $Values<typeof messageTruncationStatus>;
export const messageTruncationStatusValidator: TEnums = t.enums.of(
  values(messageTruncationStatus),
);

export function assertMessageTruncationStatus(
  ourMessageTruncationStatus: string,
): MessageTruncationStatus {
  invariant(
    ourMessageTruncationStatus === 'truncated' ||
      ourMessageTruncationStatus === 'unchanged' ||
      ourMessageTruncationStatus === 'exhaustive',
    'string is not ourMessageTruncationStatus enum',
  );
  return ourMessageTruncationStatus;
}
export type MessageTruncationStatuses = {
  [threadID: string]: MessageTruncationStatus,
};

export type ThreadCursors = { +[threadID: string]: ?string };

export type ThreadSelectionCriteria = {
  +threadCursors?: ?ThreadCursors,
  +joinedThreads?: ?boolean,
};

export type FetchMessageInfosRequest = {
  +cursors: ThreadCursors,
  +numberPerThread?: ?number,
};
export type FetchMessageInfosResponse = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
  +userInfos: UserInfos,
};
export type FetchMessageInfosResult = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
};
export type FetchMessageInfosPayload = {
  +threadID: string,
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatus: MessageTruncationStatus,
};
export type MessagesResponse = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
  +currentAsOf: number,
};
export const defaultNumberPerThread = 20;

export type SendMessageResponse = {
  +newMessageInfo: RawMessageInfo,
};
export type SendMessageResult = {
  +id: string,
  +time: number,
  +interface: FetchResultInfoInterface,
};
export type SendMessagePayload = {
  +localID: string,
  +serverID: string,
  +threadID: string,
  +time: number,
  +interface: FetchResultInfoInterface,
};

export type SendTextMessageRequest = {
  +threadID: string,
  +localID?: string,
  +text: string,
};
export type SendMultimediaMessageRequest = {
  +threadID: string,
  +localID: string,
  +mediaIDs: $ReadOnlyArray<string>,
};

// Used for the message info included in log-in type actions
export type GenericMessagesResult = {
  +messageInfos: RawMessageInfo[],
  +truncationStatus: MessageTruncationStatuses,
  +watchedIDsAtRequestTime: $ReadOnlyArray<string>,
  +currentAsOf: number,
};

export type SaveMessagesPayload = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updatesCurrentAsOf: number,
};

export type NewMessagesPayload = {
  +messagesResult: MessagesResponse,
};

export type MessageStorePrunePayload = {
  +threadIDs: $ReadOnlyArray<string>,
};
