// @flow
import type { Shape } from './core';
import type { CalendarQuery, RawEntryInfo } from './entry-types';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
} from './message-types';
import { type ThreadType, type RawThreadInfo } from './thread-types';
import type { ServerUpdateInfo, ClientUpdateInfo } from './update-types';
import type { UserInfo, AccountUserInfo } from './user-types';

export type ThreadDeletionRequest = {
  +threadID: string,
  +accountPassword: string,
};

export type RemoveMembersRequest = {
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
};

export type RoleChangeRequest = {
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
  +role: string,
};

export type ChangeThreadSettingsResult = {
  +threadInfo?: RawThreadInfo,
  +threadInfos?: { +[id: string]: RawThreadInfo },
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
};

export type ChangeThreadSettingsPayload = {
  +threadID: string,
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
};

export type LeaveThreadRequest = {
  +threadID: string,
};
export type LeaveThreadResult = {
  +threadInfos?: { +[id: string]: RawThreadInfo },
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
};

export type LeaveThreadPayload = {
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
};

export type ThreadChanges = Shape<{
  +type: ThreadType,
  +name: string,
  +description: string,
  +color: string,
  +parentThreadID: ?string,
  +newMemberIDs: $ReadOnlyArray<string>,
}>;

export type UpdateThreadRequest = {
  +threadID: string,
  +changes: ThreadChanges,
};

export type BaseNewThreadRequest = {
  +id?: ?string,
  +name?: ?string,
  +description?: ?string,
  +color?: ?string,
  +parentThreadID?: ?string,
  +initialMemberIDs?: ?$ReadOnlyArray<string>,
  +ghostMemberIDs?: ?$ReadOnlyArray<string>,
};
type NewThreadRequest =
  | {
      +type: 3 | 4 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
      ...BaseNewThreadRequest,
    }
  | {
      +type: 5,
      +sourceMessageID: string,
      ...BaseNewThreadRequest,
    };

export type ClientNewThreadRequest = {
  ...NewThreadRequest,
  +calendarQuery: CalendarQuery,
};
export type ServerNewThreadRequest = {
  ...NewThreadRequest,
  +calendarQuery?: ?CalendarQuery,
};

export type NewThreadResponse = {
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +newThreadInfo?: RawThreadInfo,
  +userInfos: { [string]: AccountUserInfo },
  +newThreadID?: string,
};
export type NewThreadResult = {
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +userInfos: { [string]: AccountUserInfo },
  +newThreadID: string,
};

export type ServerThreadJoinRequest = {
  +threadID: string,
  +calendarQuery?: ?CalendarQuery,
};
export type ClientThreadJoinRequest = {
  +threadID: string,
  +calendarQuery: CalendarQuery,
};
export type ThreadJoinResult = {
  threadInfos?: { +[id: string]: RawThreadInfo },
  updatesResult: {
    newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatuses: MessageTruncationStatuses,
  userInfos: { [string]: AccountUserInfo },
  rawEntryInfos?: ?$ReadOnlyArray<RawEntryInfo>,
};
export type ThreadJoinPayload = {
  +updatesResult: {
    newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
  +userInfos: $ReadOnlyArray<UserInfo>,
};
