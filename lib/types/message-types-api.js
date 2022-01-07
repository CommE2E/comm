// @flow

import type { FetchResultInfoInterface } from '../utils/fetch-json';
import {
  type ThreadCursors,
  type RawMessageInfo,
  type MessageTruncationStatus,
  type MessageTruncationStatuses,
} from './message-types';
import { type UserInfos } from './user-types';

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
