// @flow

import type { PlatformDetails } from '../../types/device-types';
import type { Media } from '../../types/media-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
  RawComposableMessageInfo,
  RawMessageInfo,
  RawRobotextMessageInfo,
  RobotextMessageInfo,
} from '../../types/message-types';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo, ThreadType } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import type { EntityText } from '../../utils/entity-text';
import { type ParserRules } from '../markdown';

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
  +notifThreadName: (threadInfo: ThreadInfo) => string,
  +notifTextForSubthreadCreation: (
    creator: RelativeUserInfo,
    threadType: ThreadType,
    parentThreadInfo: ThreadInfo,
    childThreadName: ?string,
    childThreadUIName: string,
  ) => NotifTexts,
  +strippedRobotextForMessageInfo: (
    messageInfo: RobotextMessageInfo,
    threadInfo: ThreadInfo,
  ) => string,
  +notificationTexts: (
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ) => Promise<NotifTexts>,
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
  ) => Promise<NotifTexts>,
  +notificationCollapseKey?: (rawMessageInfo: RawInfo) => string,
  +generatesNotifs: (
    rawMessageInfo: RawInfo,
    params: GeneratesNotifsParams,
  ) => Promise<?PushType>,
  +userIDs?: (rawMessageInfo: RawInfo) => $ReadOnlyArray<string>,
  +startsThread?: boolean,
  +threadIDs?: (rawMessageInfo: RawInfo) => $ReadOnlyArray<string>,
  +includedInRepliesCount?: boolean,
};
