// @flow
import t, { type TInterface } from 'tcomb';

import { tID, tShape } from '../utils/validation-utils';
import { type Shape } from './core';
import {
  type RawEntryInfo,
  rawEntryInfoValidator,
  type CalendarQuery,
} from './entry-types';
import {
  type RawMessageInfo,
  type MessageTruncationStatuses,
  messageTruncationStatusesValidator,
  rawMessageInfoValidator,
} from './message-types';
import {
  type RawThreadInfo,
  rawThreadInfoValidator,
  type ThreadType,
} from './thread-types';
import {
  type ServerUpdateInfo,
  type ClientUpdateInfo,
  serverUpdateInfoValidator,
} from './update-types';
import {
  type AccountUserInfo,
  accountUserInfoValidator,
  type UserInfo,
} from './user-types';
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
export const changeThreadSettingsResultValidator: TInterface = tShape({
  threadInfo: t.maybe(rawThreadInfoValidator),
  threadInfos: t.maybe(t.dict(tID, rawThreadInfoValidator)),
  updatesResult: tShape({
    newUpdates: t.list(serverUpdateInfoValidator),
  }),
  newMessageInfos: t.list(rawMessageInfoValidator),
});

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
export const leaveThreadResultValidator: TInterface = tShape({
  threadInfos: t.maybe(t.dict(tID, rawThreadInfoValidator)),
  updatesResult: tShape({
    newUpdates: t.list(serverUpdateInfoValidator),
  }),
});

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
export const newThreadResponseValidator: TInterface = tShape({
  updatesResult: tShape({
    newUpdates: t.list(serverUpdateInfoValidator),
  }),
  newMessageInfos: t.list(rawMessageInfoValidator),
  newThreadInfo: t.maybe(rawThreadInfoValidator),
  userInfos: t.dict(t.String, accountUserInfoValidator),
  newThreadID: t.maybe(tID),
});
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
export const threadJoinResultValidator: TInterface = tShape({
  threadInfos: t.maybe(t.dict(tID, rawThreadInfoValidator)),
  updatesResult: tShape({
    newUpdates: t.list(serverUpdateInfoValidator),
  }),
  rawMessageInfos: t.list(rawMessageInfoValidator),
  truncationStatuses: messageTruncationStatusesValidator,
  userInfos: t.dict(t.String, accountUserInfoValidator),
  rawEntryInfos: t.maybe(t.list(rawEntryInfoValidator)),
});
export type ThreadJoinPayload = {
  +updatesResult: {
    newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
  +userInfos: $ReadOnlyArray<UserInfo>,
};
