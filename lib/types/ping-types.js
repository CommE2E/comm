// @flow

import type { RawThreadInfo } from './thread-types';
import type { CurrentUserInfo, UserInfo } from './user-types';
import type { CalendarQuery, RawEntryInfo } from './entry-types';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
  MessagesResponse,
} from './message-types';
import type { UpdatesResult } from './update-types';
import type { ServerRequest, ClientResponse } from './request-types';
import { stateSyncPayloadTypes } from './socket-types';

export type PingRequest = {|
  type?: PingResponseType,
  calendarQuery: CalendarQuery,
  watchedIDs: $ReadOnlyArray<string>,
  lastPing?: ?number,
  messagesCurrentAsOf: ?number,
  updatesCurrentAsOf: ?number,
  clientResponses?: $ReadOnlyArray<ClientResponse>,
|};

export const pingResponseTypes = stateSyncPayloadTypes;
type PingResponseType = $Values<typeof pingResponseTypes>;

export type PingResponse =
  | {|
      type: 0,
      threadInfos: { [id: string]: RawThreadInfo },
      currentUserInfo: CurrentUserInfo,
      rawMessageInfos: RawMessageInfo[],
      truncationStatuses: MessageTruncationStatuses,
      messagesCurrentAsOf: number,
      serverTime: number,
      rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
      userInfos: $ReadOnlyArray<UserInfo>,
      updatesResult?: UpdatesResult,
      serverRequests?: $ReadOnlyArray<ServerRequest>,
      deltaEntryInfos?: $ReadOnlyArray<RawEntryInfo>,
    |}
  | {|
      type: 1,
      messagesResult: MessagesResponse,
      updatesResult?: UpdatesResult,
      deltaEntryInfos: $ReadOnlyArray<RawEntryInfo>,
      userInfos: $ReadOnlyArray<UserInfo>,
      serverRequests: $ReadOnlyArray<ServerRequest>,
    |};
