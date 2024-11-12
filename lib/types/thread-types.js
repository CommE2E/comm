// @flow

import t, { type TInterface } from 'tcomb';

import {
  type AvatarDBContent,
  type ClientAvatar,
  clientAvatarValidator,
  type UpdateUserAvatarRequest,
} from './avatar-types.js';
import type { CalendarQuery } from './entry-types.js';
import type { Media } from './media-types.js';
import type {
  MessageTruncationStatuses,
  RawMessageInfo,
} from './message-types.js';
import type {
  RawThreadInfo,
  ResolvedThreadInfo,
  ThreadInfo,
  ThickRawThreadInfo,
} from './minimally-encoded-thread-permissions-types.js';
import {
  type ThreadSubscription,
  threadSubscriptionValidator,
} from './subscription-types.js';
import {
  type ThreadPermissionsInfo,
  threadPermissionsInfoValidator,
  type ThreadRolePermissionsBlob,
  threadRolePermissionsBlobValidator,
  type UserSurfacedPermission,
} from './thread-permission-types.js';
import {
  type ThinThreadType,
  type ThickThreadType,
  threadTypeValidator,
} from './thread-types-enum.js';
import type { ClientUpdateInfo, ServerUpdateInfo } from './update-types.js';
import type { UserInfo, UserInfos } from './user-types.js';
import type { SpecialRole } from '../permissions/special-roles.js';
import { type ThreadEntity } from '../utils/entity-text.js';
import { tID, tShape, tUserID } from '../utils/validation-utils.js';

export type LegacyMemberInfo = {
  +id: string,
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +isSender: boolean,
};
export const legacyMemberInfoValidator: TInterface<LegacyMemberInfo> =
  tShape<LegacyMemberInfo>({
    id: tUserID,
    role: t.maybe(tID),
    permissions: threadPermissionsInfoValidator,
    isSender: t.Boolean,
  });

export type ClientLegacyRoleInfo = {
  +id: string,
  +name: string,
  +permissions: ThreadRolePermissionsBlob,
  +isDefault: boolean,
};
export const clientLegacyRoleInfoValidator: TInterface<ClientLegacyRoleInfo> =
  tShape<ClientLegacyRoleInfo>({
    id: tID,
    name: t.String,
    permissions: threadRolePermissionsBlobValidator,
    isDefault: t.Boolean,
  });

export type ServerLegacyRoleInfo = {
  +id: string,
  +name: string,
  +permissions: ThreadRolePermissionsBlob,
  +isDefault: boolean,
  +specialRole: ?SpecialRole,
};

export type LegacyThreadCurrentUserInfo = {
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +subscription: ThreadSubscription,
  +unread: ?boolean,
};
export const legacyThreadCurrentUserInfoValidator: TInterface<LegacyThreadCurrentUserInfo> =
  tShape<LegacyThreadCurrentUserInfo>({
    role: t.maybe(tID),
    permissions: threadPermissionsInfoValidator,
    subscription: threadSubscriptionValidator,
    unread: t.maybe(t.Boolean),
  });

export type LegacyThinRawThreadInfo = {
  +id: string,
  +type: ThinThreadType,
  +name?: ?string,
  +avatar?: ?ClientAvatar,
  +description?: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID?: ?string,
  +community: ?string,
  +members: $ReadOnlyArray<LegacyMemberInfo>,
  +roles: { +[id: string]: ClientLegacyRoleInfo },
  +currentUser: LegacyThreadCurrentUserInfo,
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount?: number,
};

export type ThickMemberInfo = {
  +id: string,
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +subscription: ThreadSubscription,
  +isSender: boolean,
};

export type ThreadTimestamps = {
  +name: number,
  +avatar: number,
  +description: number,
  +color: number,
  +members: {
    +[id: string]: {
      +isMember: number,
      +subscription: number,
    },
  },
  +currentUser: {
    +unread: number,
  },
};

export const threadTimestampsValidator: TInterface<ThreadTimestamps> =
  tShape<ThreadTimestamps>({
    name: t.Number,
    avatar: t.Number,
    description: t.Number,
    color: t.Number,
    members: t.dict(
      tUserID,
      tShape({
        isMember: t.Number,
        subscription: t.Number,
      }),
    ),
    currentUser: tShape({
      unread: t.Number,
    }),
  });

export type LegacyThickRawThreadInfo = {
  +thick: true,
  +id: string,
  +type: ThickThreadType,
  +name?: ?string,
  +avatar?: ?ClientAvatar,
  +description?: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID?: ?string,
  +containingThreadID?: ?string,
  +members: $ReadOnlyArray<ThickMemberInfo>,
  +roles: { +[id: string]: ClientLegacyRoleInfo },
  +currentUser: LegacyThreadCurrentUserInfo,
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount?: number,
  +timestamps: ThreadTimestamps,
};

export type LegacyRawThreadInfo =
  | LegacyThinRawThreadInfo
  | LegacyThickRawThreadInfo;

export type LegacyRawThreadInfos = {
  +[id: string]: LegacyRawThreadInfo,
};
export const legacyRawThreadInfoValidator: TInterface<LegacyRawThreadInfo> =
  tShape<LegacyRawThreadInfo>({
    id: tID,
    type: threadTypeValidator,
    name: t.maybe(t.String),
    avatar: t.maybe(clientAvatarValidator),
    description: t.maybe(t.String),
    color: t.String,
    creationTime: t.Number,
    parentThreadID: t.maybe(tID),
    containingThreadID: t.maybe(tID),
    community: t.maybe(tID),
    members: t.list(legacyMemberInfoValidator),
    roles: t.dict(tID, clientLegacyRoleInfoValidator),
    currentUser: legacyThreadCurrentUserInfoValidator,
    sourceMessageID: t.maybe(tID),
    repliesCount: t.Number,
    pinnedCount: t.maybe(t.Number),
  });

export type MixedRawThreadInfos = {
  +[id: string]: LegacyRawThreadInfo | RawThreadInfo,
};
export type ThickRawThreadInfos = {
  +[id: string]: ThickRawThreadInfo,
};
export type RawThreadInfos = {
  +[id: string]: RawThreadInfo,
};

export type ServerMemberInfo = {
  +id: string,
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +subscription: ThreadSubscription,
  +unread: ?boolean,
  +isSender: boolean,
};

export type ServerThreadInfo = {
  +id: string,
  +type: ThinThreadType,
  +name: ?string,
  +avatar?: AvatarDBContent,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +depth: number,
  +members: $ReadOnlyArray<ServerMemberInfo>,
  +roles: { +[id: string]: ServerLegacyRoleInfo },
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount: number,
};

export type LegacyThreadStore = {
  +threadInfos: MixedRawThreadInfos,
};

export type ThreadStore = {
  +threadInfos: RawThreadInfos,
};

export type ClientDBThreadInfo = {
  +id: string,
  +type: number,
  +name: ?string,
  +avatar?: ?string,
  +description: ?string,
  +color: string,
  +creationTime: string,
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: string,
  +roles: string,
  +currentUser: string,
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount?: number,
  +timestamps?: ?string,
};

export type ThreadDeletionRequest = {
  +threadID: string,
  +accountPassword?: empty,
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
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
};

export type LeaveThreadPayload = {
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
};

type BaseThreadChanges = {
  +type: ThinThreadType,
  +name: string,
  +description: string,
  +color: string,
  +parentThreadID: ?string,
  +avatar: UpdateUserAvatarRequest,
};

export type ThreadChanges = Partial<BaseThreadChanges>;

export type ThinThreadChanges = $ReadOnly<
  $Partial<{ ...BaseThreadChanges, +newMemberIDs: $ReadOnlyArray<string> }>,
>;

export type UpdateThreadRequest = {
  +threadID: string,
  +changes: ThinThreadChanges,
  +accountPassword?: empty,
};

export type UpdateThickThreadRequest = $ReadOnly<{
  ...UpdateThreadRequest,
  +changes: ThreadChanges,
}>;

export type BaseNewThreadRequest = {
  +id?: ?string,
  +name?: ?string,
  +description?: ?string,
  +color?: ?string,
  +parentThreadID?: ?string,
  +initialMemberIDs?: ?$ReadOnlyArray<string>,
  +ghostMemberIDs?: ?$ReadOnlyArray<string>,
};
type NewThinThreadRequest =
  | $ReadOnly<{
      +type: 3 | 4 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
      ...BaseNewThreadRequest,
    }>
  | $ReadOnly<{
      +type: 5,
      +sourceMessageID: string,
      ...BaseNewThreadRequest,
      +parentThreadID: string,
    }>;

export type ClientNewThinThreadRequest = $ReadOnly<{
  ...NewThinThreadRequest,
  +calendarQuery: CalendarQuery,
}>;
export type ServerNewThinThreadRequest = $ReadOnly<{
  ...NewThinThreadRequest,
  +calendarQuery?: ?CalendarQuery,
}>;

export type NewThickThreadRequest =
  | $ReadOnly<{
      +type: 13 | 14 | 15,
      ...BaseNewThreadRequest,
    }>
  | $ReadOnly<{
      +type: 16,
      +sourceMessageID: string,
      ...BaseNewThreadRequest,
      +parentThreadID: string,
    }>;

export type NewThreadResponse = {
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +userInfos: UserInfos,
  +newThreadID: string,
};
export type NewThreadResult = {
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +userInfos: UserInfos,
  +newThreadID: string,
};

export type ServerThreadJoinRequest = {
  +threadID: string,
  +calendarQuery?: ?CalendarQuery,
  +inviteLinkSecret?: string,
  +defaultSubscription?: ThreadSubscription,
};
export type ClientThreadJoinRequest = {
  +threadID: string,
  +calendarQuery: CalendarQuery,
  +inviteLinkSecret?: string,
  +defaultSubscription?: ThreadSubscription,
};
export type ThreadJoinResult = {
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
  +userInfos: UserInfos,
};
export type ThreadJoinPayload = {
  +updatesResult: {
    newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +keyserverID?: string,
};

export type ThreadFetchMediaResult = {
  +media: $ReadOnlyArray<Media>,
};
export type ThreadFetchMediaRequest = {
  +threadID: string,
  +limit: number,
  +offset: number,
};

export type LastUpdatedTimes = {
  // The last updated time is at least this number, but possibly higher
  // We won't know for sure until the below Promise resolves
  +lastUpdatedAtLeastTime: number,
  +lastUpdatedTime: Promise<number>,
};

export type SidebarInfo = $ReadOnly<{
  ...LastUpdatedTimes,
  +threadInfo: ThreadInfo,
  +mostRecentNonLocalMessage: ?string,
}>;

export type ToggleMessagePinRequest = {
  +messageID: string,
  +action: 'pin' | 'unpin',
};

export type ToggleMessagePinResult = {
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +threadID: string,
};

type CreateRoleAction = {
  +community: string,
  +name: string,
  +permissions: $ReadOnlyArray<UserSurfacedPermission>,
  +action: 'create_role',
};

type EditRoleAction = {
  +community: string,
  +existingRoleID: string,
  +name: string,
  +permissions: $ReadOnlyArray<UserSurfacedPermission>,
  +action: 'edit_role',
};

export type RoleModificationRequest = CreateRoleAction | EditRoleAction;

export type RoleModificationResult = {
  +threadInfo: LegacyRawThreadInfo | RawThreadInfo,
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
};

export type RoleModificationPayload = {
  +threadInfo: LegacyRawThreadInfo | RawThreadInfo,
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
};

export type RoleDeletionRequest = {
  +community: string,
  +roleID: string,
};

export type RoleDeletionResult = {
  +threadInfo: LegacyRawThreadInfo | RawThreadInfo,
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
};

export type RoleDeletionPayload = {
  +threadInfo: LegacyRawThreadInfo | RawThreadInfo,
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
};

// We can show a max of 3 sidebars inline underneath their parent in the chat
// tab. If there are more, we show a button that opens a modal to see the rest
export const maxReadSidebars = 3;

// We can show a max of 5 sidebars inline underneath their parent
// in the chat tab if every one of the displayed sidebars is unread
export const maxUnreadSidebars = 5;

export type ThreadStoreThreadInfos = LegacyRawThreadInfos;

export type ChatMentionCandidate = {
  +threadInfo: ResolvedThreadInfo,
  +rawChatName: string | ThreadEntity,
};
export type ChatMentionCandidates = {
  +[id: string]: ChatMentionCandidate,
};
export type ChatMentionCandidatesObj = {
  +[id: string]: ChatMentionCandidates,
};

export type UserProfileThreadInfo = {
  +threadInfo: ThreadInfo,
  +pendingPersonalThreadUserInfo?: UserInfo,
};
