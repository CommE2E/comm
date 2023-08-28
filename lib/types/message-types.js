// @flow

import invariant from 'invariant';
import t, {
  type TDict,
  type TEnums,
  type TInterface,
  type TUnion,
} from 'tcomb';

import { type ClientDBMediaInfo } from './media-types.js';
import { type MessageType, messageTypes } from './message-types-enum.js';
import {
  type AddMembersMessageData,
  type AddMembersMessageInfo,
  type RawAddMembersMessageInfo,
  rawAddMembersMessageInfoValidator,
} from './messages/add-members.js';
import {
  type ChangeRoleMessageData,
  type ChangeRoleMessageInfo,
  type RawChangeRoleMessageInfo,
  rawChangeRoleMessageInfoValidator,
} from './messages/change-role.js';
import {
  type ChangeSettingsMessageData,
  type ChangeSettingsMessageInfo,
  type RawChangeSettingsMessageInfo,
  rawChangeSettingsMessageInfoValidator,
} from './messages/change-settings.js';
import {
  type CreateEntryMessageData,
  type CreateEntryMessageInfo,
  type RawCreateEntryMessageInfo,
  rawCreateEntryMessageInfoValidator,
} from './messages/create-entry.js';
import {
  type CreateSidebarMessageData,
  type CreateSidebarMessageInfo,
  type RawCreateSidebarMessageInfo,
  rawCreateSidebarMessageInfoValidator,
} from './messages/create-sidebar.js';
import {
  type CreateSubthreadMessageData,
  type CreateSubthreadMessageInfo,
  type RawCreateSubthreadMessageInfo,
  rawCreateSubthreadMessageInfoValidator,
} from './messages/create-subthread.js';
import {
  type CreateThreadMessageData,
  type CreateThreadMessageInfo,
  type RawCreateThreadMessageInfo,
  rawCreateThreadMessageInfoValidator,
} from './messages/create-thread.js';
import {
  type DeleteEntryMessageData,
  type DeleteEntryMessageInfo,
  type RawDeleteEntryMessageInfo,
  rawDeleteEntryMessageInfoValidator,
} from './messages/delete-entry.js';
import {
  type EditEntryMessageData,
  type EditEntryMessageInfo,
  type RawEditEntryMessageInfo,
  rawEditEntryMessageInfoValidator,
} from './messages/edit-entry.js';
import {
  type EditMessageData,
  type EditMessageInfo,
  type RawEditMessageInfo,
  rawEditMessageInfoValidator,
} from './messages/edit.js';
import {
  type ImagesMessageData,
  type ImagesMessageInfo,
  type RawImagesMessageInfo,
  rawImagesMessageInfoValidator,
} from './messages/images.js';
import {
  type JoinThreadMessageData,
  type JoinThreadMessageInfo,
  type RawJoinThreadMessageInfo,
  rawJoinThreadMessageInfoValidator,
} from './messages/join-thread.js';
import {
  type LeaveThreadMessageData,
  type LeaveThreadMessageInfo,
  type RawLeaveThreadMessageInfo,
  rawLeaveThreadMessageInfoValidator,
} from './messages/leave-thread.js';
import {
  type MediaMessageData,
  type MediaMessageInfo,
  type MediaMessageServerDBContent,
  type RawMediaMessageInfo,
  rawMediaMessageInfoValidator,
} from './messages/media.js';
import {
  type RawReactionMessageInfo,
  rawReactionMessageInfoValidator,
  type ReactionMessageData,
  type ReactionMessageInfo,
} from './messages/reaction.js';
import {
  type RawRemoveMembersMessageInfo,
  rawRemoveMembersMessageInfoValidator,
  type RemoveMembersMessageData,
  type RemoveMembersMessageInfo,
} from './messages/remove-members.js';
import {
  type RawRestoreEntryMessageInfo,
  rawRestoreEntryMessageInfoValidator,
  type RestoreEntryMessageData,
  type RestoreEntryMessageInfo,
} from './messages/restore-entry.js';
import {
  type RawTextMessageInfo,
  rawTextMessageInfoValidator,
  type TextMessageData,
  type TextMessageInfo,
} from './messages/text.js';
import {
  type RawTogglePinMessageInfo,
  rawTogglePinMessageInfoValidator,
  type TogglePinMessageData,
  type TogglePinMessageInfo,
} from './messages/toggle-pin.js';
import {
  type RawUnsupportedMessageInfo,
  rawUnsupportedMessageInfoValidator,
  type UnsupportedMessageInfo,
} from './messages/unsupported.js';
import {
  type RawUpdateRelationshipMessageInfo,
  rawUpdateRelationshipMessageInfoValidator,
  type UpdateRelationshipMessageData,
  type UpdateRelationshipMessageInfo,
} from './messages/update-relationship.js';
import { type RelativeUserInfo, type UserInfos } from './user-types.js';
import type { CallServerEndpointResultInfoInterface } from '../utils/call-server-endpoint.js';
import { values } from '../utils/objects.js';
import { tID, tNumber, tShape } from '../utils/validation-utils.js';

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
    messageData.type !== messageTypes.MULTIMEDIA &&
    messageData.type !== messageTypes.REACTION
  ) {
    return null;
  }
  return messageData.localID;
}

export function isMessageSidebarSourceReactionEditOrPin(
  message: RawMessageInfo | MessageInfo,
): boolean %checks {
  return (
    message.type === messageTypes.SIDEBAR_SOURCE ||
    message.type === messageTypes.REACTION ||
    message.type === messageTypes.EDIT_MESSAGE ||
    message.type === messageTypes.TOGGLE_PIN
  );
}

const mediaMessageTypes = new Set([
  messageTypes.IMAGES,
  messageTypes.MULTIMEDIA,
]);
export function isMediaMessageType(ourMessageType: MessageType): boolean {
  return mediaMessageTypes.has(ourMessageType);
}
export function assertMediaMessageType(
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
  | CreateSidebarMessageData
  | ReactionMessageData
  | EditMessageData
  | TogglePinMessageData;

export type MultimediaMessageData = ImagesMessageData | MediaMessageData;

export type RawMultimediaMessageInfo =
  | RawImagesMessageInfo
  | RawMediaMessageInfo;
export const rawMultimediaMessageInfoValidator: TUnion<RawMultimediaMessageInfo> =
  t.union([rawImagesMessageInfoValidator, rawMediaMessageInfoValidator]);

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
  | RawUnsupportedMessageInfo
  | RawTogglePinMessageInfo;
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
  rawTogglePinMessageInfoValidator,
]);

export type RawSidebarSourceMessageInfo = {
  ...SidebarSourceMessageData,
  id: string,
};
export const rawSidebarSourceMessageInfoValidator: TInterface<RawSidebarSourceMessageInfo> =
  tShape<RawSidebarSourceMessageInfo>({
    type: tNumber(messageTypes.SIDEBAR_SOURCE),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    sourceMessage: t.maybe(
      t.union([
        rawComposableMessageInfoValidator,
        rawRobotextMessageInfoValidator,
      ]),
    ),
    id: tID,
  });

export type RawMessageInfo =
  | RawComposableMessageInfo
  | RawRobotextMessageInfo
  | RawSidebarSourceMessageInfo
  | RawReactionMessageInfo
  | RawEditMessageInfo;
export const rawMessageInfoValidator: TUnion<RawMessageInfo> = t.union([
  rawComposableMessageInfoValidator,
  rawRobotextMessageInfoValidator,
  rawSidebarSourceMessageInfoValidator,
  rawReactionMessageInfoValidator,
  rawEditMessageInfoValidator,
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
    } & RawTextMessageInfo)
  | ({
      ...RawReactionMessageInfo,
      +localID: string,
    } & RawReactionMessageInfo);

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
  | CreateSidebarMessageInfo
  | TogglePinMessageInfo;
export type PreviewableMessageInfo =
  | RobotextMessageInfo
  | MultimediaMessageInfo
  | ReactionMessageInfo;

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
  | SidebarSourceMessageInfo
  | ReactionMessageInfo
  | EditMessageInfo;

export type ThreadMessageInfo = {
  messageIDs: string[],
  startReached: boolean,
  lastNavigatedTo: number, // millisecond timestamp
  lastPruned: number, // millisecond timestamp
};
const threadMessageInfoValidator: TInterface<ThreadMessageInfo> =
  tShape<ThreadMessageInfo>({
    messageIDs: t.list(tID),
    startReached: t.Boolean,
    lastNavigatedTo: t.Number,
    lastPruned: t.Number,
  });

// Tracks client-local information about a message that hasn't been assigned an
// ID by the server yet. As soon as the client gets an ack from the server for
// this message, it will clear the LocalMessageInfo.
export type LocalMessageInfo = {
  +sendFailed?: boolean,
};
const localMessageInfoValidator: TInterface<LocalMessageInfo> =
  tShape<LocalMessageInfo>({
    sendFailed: t.maybe(t.Boolean),
  });

export type MessageStoreThreads = {
  +[threadID: string]: ThreadMessageInfo,
};
const messageStoreThreadsValidator: TDict<MessageStoreThreads> = t.dict(
  tID,
  threadMessageInfoValidator,
);

export type MessageStore = {
  +messages: { +[id: string]: RawMessageInfo },
  +threads: MessageStoreThreads,
  +local: { +[id: string]: LocalMessageInfo },
  +currentAsOf: { +[keyserverID: string]: number },
};
export const messageStoreValidator: TInterface<MessageStore> =
  tShape<MessageStore>({
    messages: t.dict(tID, rawMessageInfoValidator),
    threads: messageStoreThreadsValidator,
    local: t.dict(t.String, localMessageInfoValidator),
    currentAsOf: t.dict(t.String, t.Number),
  });

// We were initially using `number`s` for `thread`, `type`, `future_type`, etc.
// However, we ended up changing `thread` to `string` to account for thread IDs
// including information about the keyserver (eg 'GENESIS|123') in the future.
//
// At that point we discussed whether we should switch the remaining `number`
// fields to `string`s for consistency and flexibility. We researched whether
// there was any performance cost to using `string`s instead of `number`s and
// found the differences to be negligible. We also concluded using `string`s
// may be safer after considering `jsi::Number` and the various C++ number
// representations on the CommCoreModule side.
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

export type ClientDBThreadMessageInfo = {
  +id: string,
  +start_reached: string,
  +last_navigated_to: string,
  +last_pruned: string,
};

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
  //  2) getMessageInfos: MessageSelectionCriteria does not specify cursors, the
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
export const messageTruncationStatusValidator: TEnums = t.enums.of(
  values(messageTruncationStatus),
);
export type MessageTruncationStatuses = {
  [threadID: string]: MessageTruncationStatus,
};
export const messageTruncationStatusesValidator: TDict<MessageTruncationStatuses> =
  t.dict(tID, messageTruncationStatusValidator);

export type ThreadCursors = { +[threadID: string]: ?string };

export type MessageSelectionCriteria = {
  +threadCursors?: ?ThreadCursors,
  +joinedThreads?: ?boolean,
  +newerThan?: ?number,
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
export const messagesResponseValidator: TInterface<MessagesResponse> =
  tShape<MessagesResponse>({
    rawMessageInfos: t.list(rawMessageInfoValidator),
    truncationStatuses: messageTruncationStatusesValidator,
    currentAsOf: t.Number,
  });
export type SimpleMessagesPayload = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
};
export const defaultNumberPerThread = 20;
export const defaultMaxMessageAge = 14 * 24 * 60 * 60 * 1000; // 2 weeks

export type SendMessageResponse = {
  +newMessageInfo: RawMessageInfo,
};
export type SendMessageResult = {
  +id: string,
  +time: number,
  +interface: CallServerEndpointResultInfoInterface,
};

export type SendMessagePayload = {
  +localID: string,
  +serverID: string,
  +threadID: string,
  +time: number,
  +interface: CallServerEndpointResultInfoInterface,
};

export type SendTextMessageRequest = {
  +threadID: string,
  +localID?: string,
  +text: string,
  +sidebarCreation?: boolean,
};
export type SendMultimediaMessageRequest =
  // This option is only used for messageTypes.IMAGES
  | {
      +threadID: string,
      +localID: string,
      +sidebarCreation?: boolean,
      +mediaIDs: $ReadOnlyArray<string>,
    }
  | {
      +threadID: string,
      +localID: string,
      +sidebarCreation?: boolean,
      +mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent>,
    };

export type SendReactionMessageRequest = {
  +threadID: string,
  +localID?: string,
  +targetMessageID: string,
  +reaction: string,
  +action: 'add_reaction' | 'remove_reaction',
};

export type SendEditMessageRequest = {
  +targetMessageID: string,
  +text: string,
};

export type SendEditMessageResponse = {
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
};

export type EditMessagePayload = SendEditMessageResponse;
export type SendEditMessageResult = SendEditMessageResponse;

export type EditMessageContent = {
  +text: string,
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
export const newMessagesPayloadValidator: TInterface<NewMessagesPayload> =
  tShape<NewMessagesPayload>({
    messagesResult: messagesResponseValidator,
  });

export type MessageStorePrunePayload = {
  +threadIDs: $ReadOnlyArray<string>,
};

export type FetchPinnedMessagesRequest = {
  +threadID: string,
};

export type FetchPinnedMessagesResult = {
  +pinnedMessages: $ReadOnlyArray<RawMessageInfo>,
};

export type SearchMessagesRequest = {
  +query: string,
  +threadID: string,
  +cursor?: string,
};

export type SearchMessagesResponse = {
  +messages: $ReadOnlyArray<RawMessageInfo>,
  +endReached: boolean,
};
