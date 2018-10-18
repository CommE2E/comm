// @flow

import type { RawThreadInfo } from './thread-types';
import type { CurrentUserInfo, UserInfo } from './user-types';
import type {
  CalendarQuery,
  CalendarResult,
  RawEntryInfo,
} from './entry-types';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
  MessagesPingResponse,
  GenericMessagesResult,
} from './message-types';
import type { UpdatesResult } from './update-types';
import type { Platform } from './device-types';
import type { ServerRequest, ClientResponse } from './request-types';

import PropTypes from 'prop-types';

export type PingRequest = {|
  type?: PingResponseType,
  calendarQuery: CalendarQuery,
  watchedIDs: $ReadOnlyArray<string>,
  lastPing?: ?number,
  messagesCurrentAsOf: ?number,
  updatesCurrentAsOf: ?number,
  clientResponses?: $ReadOnlyArray<ClientResponse>,
|};

export const pingResponseTypes = Object.freeze({
  FULL: 0,
  INCREMENTAL: 1,
});
type PingResponseType = $Values<typeof pingResponseTypes>;

export type PingResponse =
  | {|
      type: 0,
      threadInfos: {[id: string]: RawThreadInfo},
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
      messagesResult: MessagesPingResponse,
      updatesResult?: UpdatesResult,
      deltaEntryInfos: $ReadOnlyArray<RawEntryInfo>,
      userInfos: $ReadOnlyArray<UserInfo>,
      serverRequests: $ReadOnlyArray<ServerRequest>,
    |};
