// @flow

import type { PlatformDetails } from '../../types/device-types.js';
import type { Media } from '../../types/media-types.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
  RawComposableMessageInfo,
  RawMessageInfo,
  RawRobotextMessageInfo,
} from '../../types/message-types.js';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
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
  +derivedMessages: $ReadOnlyMap<
    string,
    RawComposableMessageInfo | RawRobotextMessageInfo,
  >,
};

export type CreateMessageInfoParams = {
  +threadInfos: { +[id: string]: ThreadInfo },
  +createMessageInfoFromRaw: (rawInfo: RawMessageInfo) => ?MessageInfo,
  +createRelativeUserInfos: (
    userIDs: $ReadOnlyArray<string>,
  ) => RelativeUserInfo[],
};

export type RobotextParams = {
  +threadInfo: ?ThreadInfo,
};

export type NotificationTextsParams = {
  +notificationTexts: (
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ) => Promise<?NotifTexts>,
  +notifTargetUserInfo: UserInfo,
};

export type GeneratesNotifsParams = {
  +notifTargetUserID: string,
  +userNotMemberOfSubthreads: Set<string>,
  +fetchMessageInfoByID: (messageID: string) => Promise<?RawMessageInfo>,
};

export const pushTypes = Object.freeze({
  NOTIF: 'notif',
  RESCIND: 'rescind',
});
export type PushType = $Values<typeof pushTypes>;

export type CreationSideEffectsFunc<RawInfo> = (
  messageInfo: RawInfo,
  threadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
) => Promise<mixed>;

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
  +generatesNotifs: (
    rawMessageInfo: RawInfo,
    messageData: Data,
    params: GeneratesNotifsParams,
  ) => Promise<?PushType>,
  +userIDs?: (rawMessageInfo: RawInfo) => $ReadOnlyArray<string>,
  +startsThread?: boolean,
  +threadIDs?: (rawMessageInfo: RawInfo) => $ReadOnlyArray<string>,
  +includedInRepliesCount?: boolean,
  +useCreationSideEffectsFunc?: () => CreationSideEffectsFunc<RawInfo>,
};
