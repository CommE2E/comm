// @flow

import type { TType } from 'tcomb';

import type { RobotextChatMessageInfoItem } from '../../selectors/chat-selectors.js';
import type { PlatformDetails } from '../../types/device-types.js';
import type { Media } from '../../types/media-types.js';
import type {
  ClientDBMessageInfo,
  MessageInfo,
  RawComposableMessageInfo,
  RawMessageInfo,
  RawRobotextMessageInfo,
} from '../../types/message-types.js';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { RelativeUserInfo, UserInfo } from '../../types/user-types.js';
import type { EntityText } from '../../utils/entity-text.js';
import { type ParserRules } from '../markdown.js';

export type MessageTitleParam<Info> = {
  +messageInfo: Info,
  +threadInfo: ThreadInfo,
  +markdownRules: ParserRules,
};

export type RawMessageInfoFromServerDBRowParams = {
  +localID: ?string,
  +media?: $ReadOnlyArray<Media>,
  +derivedMessages?: $ReadOnlyMap<
    string,
    RawComposableMessageInfo | RawRobotextMessageInfo,
  >,
};

export type CreateMessageInfoParams = {
  +threadInfos: {
    +[id: string]: ThreadInfo,
  },
  +createMessageInfoFromRaw: (rawInfo: RawMessageInfo) => ?MessageInfo,
  +createRelativeUserInfos: (
    userIDs: $ReadOnlyArray<string>,
  ) => RelativeUserInfo[],
};

export type RobotextParams = {
  +threadInfo: ?ThreadInfo,
  +parentThreadInfo: ?ThreadInfo,
};

export type NotificationTextsParams = {
  +notifTargetUserInfo: UserInfo,
  +parentThreadInfo: ?ThreadInfo,
};

export type GeneratesNotifsParams = {
  +notifTargetUserID: string,
  +userNotMemberOfSubthreads: Set<string>,
  +fetchMessageInfoByID: (messageID: string) => Promise<?RawMessageInfo>,
};

export const messageNotifyTypes = Object.freeze({
  // Set the thread as unread and send a push notif
  NOTIF_AND_SET_UNREAD: 'notif_and_set_unread',
  // Set the thread as unread but don't send a push notif. This is the default
  SET_UNREAD: 'set_unread',
  // Do not set the thread as unread and don't send a push notif
  NONE: 'none',
  // Rescind all notifs with a matching notificationCollapseKey
  RESCIND: 'rescind',
});
export type MessageNotifyType = $Values<typeof messageNotifyTypes>;

export type CreationSideEffectsFunc<RawInfo> = (
  messageInfo: RawInfo,
  threadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
) => Promise<mixed>;

export type MergeRobotextMessageItemResult =
  | { +shouldMerge: false }
  | { +shouldMerge: true, +item: RobotextChatMessageInfoItem };

export type ShowInMessagePreviewParams = {
  +threadInfo: ThreadInfo,
  +viewerID: string,
  +getMessageAuthor: (messageID: string) => ?string | Promise<?string>,
};

export type MessageSpec<Data, RawInfo, Info> = {
  +messageContentForServerDB?: (data: Data | RawInfo) => string,
  +messageContentForClientDB?: (data: RawInfo) => string,
  +messageTitle?: (param: MessageTitleParam<Info>) => EntityText,
  +rawMessageInfoFromServerDBRow?: (
    row: Object,
    params: RawMessageInfoFromServerDBRowParams,
  ) => ?RawInfo,
  +rawMessageInfoFromClientDB: (
    clientDBMessageInfo: ClientDBMessageInfo,
  ) => RawInfo,
  +createMessageInfo: (
    rawMessageInfo: RawInfo,
    creator: RelativeUserInfo,
    params: CreateMessageInfoParams,
  ) => ?Info,
  +rawMessageInfoFromMessageData?: (messageData: Data, id: ?string) => RawInfo,
  +robotext?: (messageInfo: Info, params: RobotextParams) => EntityText,
  +shimUnsupportedMessageInfo?: (
    rawMessageInfo: RawInfo,
    platformDetails: ?PlatformDetails,
  ) => RawInfo | RawUnsupportedMessageInfo,
  +unshimMessageInfo?: (
    unwrapped: RawInfo,
    messageInfo: RawMessageInfo,
  ) => ?RawMessageInfo,
  +notificationTexts?: (
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ) => Promise<?NotifTexts>,
  +notificationCollapseKey?: (
    rawMessageInfo: RawInfo,
    messageData: Data,
  ) => ?string,
  +getMessageNotifyType?: (
    rawMessageInfo: RawInfo,
    params: GeneratesNotifsParams,
  ) => Promise<MessageNotifyType>,
  +userIDs?: (rawMessageInfo: RawInfo) => $ReadOnlyArray<string>,
  +startsThread?: boolean,
  +threadIDs?: (rawMessageInfo: RawInfo) => $ReadOnlyArray<string>,
  +includedInRepliesCount?: boolean,
  +canBeSidebarSource: boolean,
  +canBePinned: boolean,
  +canBeRenderedIndependently?: boolean,
  +parseDerivedMessages?: (row: Object, requiredIDs: Set<string>) => void,
  +useCreationSideEffectsFunc?: () => CreationSideEffectsFunc<RawInfo>,
  +validator: TType<RawInfo>,
  +mergeIntoPrecedingRobotextMessageItem?: (
    messageInfo: Info,
    precedingMessageInfoItem: RobotextChatMessageInfoItem,
    params: RobotextParams,
  ) => MergeRobotextMessageItemResult,
  +showInMessagePreview?: (
    messageInfo: Info,
    params: ShowInMessagePreviewParams,
  ) => boolean | Promise<boolean>,
  +getLastUpdatedTime?: (
    rawMessageInfo: RawInfo,
    params: ShowInMessagePreviewParams,
  ) => ?number | (() => Promise<?number>),
};
