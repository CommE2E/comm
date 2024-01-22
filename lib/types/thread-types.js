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
  MinimallyEncodedMemberInfo,
  RawThreadInfo,
  MinimallyEncodedRelativeMemberInfo,
  MinimallyEncodedResolvedThreadInfo,
  MinimallyEncodedRoleInfo,
  ThreadInfo,
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
import { type ThreadType, threadTypeValidator } from './thread-types-enum.js';
import type { ClientUpdateInfo, ServerUpdateInfo } from './update-types.js';
import type { UserInfo, UserInfos } from './user-types.js';
import {
  type ThreadEntity,
  threadEntityValidator,
} from '../utils/entity-text.js';
import { tID, tShape } from '../utils/validation-utils.js';

export type LegacyMemberInfo = {
  +id: string,
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +isSender: boolean,
};
export const legacyMemberInfoValidator: TInterface<LegacyMemberInfo> =
  tShape<LegacyMemberInfo>({
    id: t.String,
    role: t.maybe(tID),
    permissions: threadPermissionsInfoValidator,
    isSender: t.Boolean,
  });

export type MemberInfo = LegacyMemberInfo | MinimallyEncodedMemberInfo;

export type LegacyRelativeMemberInfo = $ReadOnly<{
  ...LegacyMemberInfo,
  +username: ?string,
  +isViewer: boolean,
}>;
const legacyRelativeMemberInfoValidator = tShape<LegacyRelativeMemberInfo>({
  ...legacyMemberInfoValidator.meta.props,
  username: t.maybe(t.String),
  isViewer: t.Boolean,
});

export type RelativeMemberInfo =
  | LegacyRelativeMemberInfo
  | MinimallyEncodedRelativeMemberInfo;

export type LegacyRoleInfo = {
  +id: string,
  +name: string,
  +permissions: ThreadRolePermissionsBlob,
  +isDefault: boolean,
};
export const legacyRoleInfoValidator: TInterface<LegacyRoleInfo> =
  tShape<LegacyRoleInfo>({
    id: tID,
    name: t.String,
    permissions: threadRolePermissionsBlobValidator,
    isDefault: t.Boolean,
  });

export type RoleInfo = LegacyRoleInfo | MinimallyEncodedRoleInfo;

export type ThreadCurrentUserInfo = {
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +subscription: ThreadSubscription,
  +unread: ?boolean,
};
export const threadCurrentUserInfoValidator: TInterface<ThreadCurrentUserInfo> =
  tShape<ThreadCurrentUserInfo>({
    role: t.maybe(tID),
    permissions: threadPermissionsInfoValidator,
    subscription: threadSubscriptionValidator,
    unread: t.maybe(t.Boolean),
  });

export type LegacyRawThreadInfo = {
  +id: string,
  +type: ThreadType,
  +name: ?string,
  +avatar?: ?ClientAvatar,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: $ReadOnlyArray<LegacyMemberInfo>,
  +roles: { +[id: string]: LegacyRoleInfo },
  +currentUser: ThreadCurrentUserInfo,
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount?: number,
};
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
    roles: t.dict(tID, legacyRoleInfoValidator),
    currentUser: threadCurrentUserInfoValidator,
    sourceMessageID: t.maybe(tID),
    repliesCount: t.Number,
    pinnedCount: t.maybe(t.Number),
  });

export type MixedRawThreadInfos = {
  +[id: string]: LegacyRawThreadInfo | RawThreadInfo,
};
export type RawThreadInfos = {
  +[id: string]: RawThreadInfo,
};

export type LegacyThreadInfo = {
  +id: string,
  +type: ThreadType,
  +name: ?string,
  +uiName: string | ThreadEntity,
  +avatar?: ?ClientAvatar,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: $ReadOnlyArray<LegacyRelativeMemberInfo>,
  +roles: { +[id: string]: LegacyRoleInfo },
  +currentUser: ThreadCurrentUserInfo,
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount?: number,
};
export const legacyThreadInfoValidator: TInterface<LegacyThreadInfo> =
  tShape<LegacyThreadInfo>({
    id: tID,
    type: threadTypeValidator,
    name: t.maybe(t.String),
    uiName: t.union([t.String, threadEntityValidator]),
    avatar: t.maybe(clientAvatarValidator),
    description: t.maybe(t.String),
    color: t.String,
    creationTime: t.Number,
    parentThreadID: t.maybe(tID),
    containingThreadID: t.maybe(tID),
    community: t.maybe(tID),
    members: t.list(legacyRelativeMemberInfoValidator),
    roles: t.dict(tID, legacyRoleInfoValidator),
    currentUser: threadCurrentUserInfoValidator,
    sourceMessageID: t.maybe(tID),
    repliesCount: t.Number,
    pinnedCount: t.maybe(t.Number),
  });

export type LegacyResolvedThreadInfo = {
  +id: string,
  +type: ThreadType,
  +name: ?string,
  +uiName: string,
  +avatar?: ?ClientAvatar,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: $ReadOnlyArray<LegacyRelativeMemberInfo>,
  +roles: { +[id: string]: LegacyRoleInfo },
  +currentUser: ThreadCurrentUserInfo,
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount?: number,
};

export type ResolvedThreadInfo =
  | LegacyResolvedThreadInfo
  | MinimallyEncodedResolvedThreadInfo;

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
  +type: ThreadType,
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
  +roles: { +[id: string]: LegacyRoleInfo },
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

export type ThreadChanges = Partial<{
  +type: ThreadType,
  +name: string,
  +description: string,
  +color: string,
  +parentThreadID: ?string,
  +newMemberIDs: $ReadOnlyArray<string>,
  +avatar: UpdateUserAvatarRequest,
}>;

export type UpdateThreadRequest = {
  +threadID: string,
  +changes: ThreadChanges,
  +accountPassword?: empty,
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
};
export type ClientThreadJoinRequest = {
  +threadID: string,
  +calendarQuery: CalendarQuery,
  +inviteLinkSecret?: string,
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
};

export type ThreadFetchMediaResult = {
  +media: $ReadOnlyArray<Media>,
};
export type ThreadFetchMediaRequest = {
  +threadID: string,
  +limit: number,
  +offset: number,
};

export type SidebarInfo = {
  +threadInfo: LegacyThreadInfo | ThreadInfo,
  +lastUpdatedTime: number,
  +mostRecentNonLocalMessage: ?string,
};

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
  +threadInfo: LegacyThreadInfo | ThreadInfo,
  +pendingPersonalThreadUserInfo?: UserInfo,
};
