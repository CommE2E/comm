// @flow

import invariant from 'invariant';
import t, { type TInterface, type TRefinement } from 'tcomb';

import { values } from '../utils/objects';
import { tID, tShape, tNumEnum, tBool } from '../utils/validation-utils';
import {
  type ThreadSubscription,
  threadSubscriptionValidator,
} from './subscription-types';

export const threadTypes = Object.freeze({
  //OPEN: 0,   (DEPRECATED)
  //CLOSED: 1, (DEPRECATED)
  //SECRET: 2, (DEPRECATED)
  // has parent, not top-level (appears under parent in inbox), and visible to
  // all members of parent
  SIDEBAR: 5,
  // canonical thread for each pair of users. represents the friendship
  PERSONAL: 6,
  // canonical thread for each single user
  PRIVATE: 7,
  // local "thick" thread (outside of community). no parent, can only have
  // sidebar children. currently a proxy for COMMUNITY_SECRET_SUBTHREAD until we
  // launch actual E2E
  LOCAL: 4,
  // aka "org". no parent, top-level, has admin
  COMMUNITY_ROOT: 8,
  // like COMMUNITY_ROOT, but members aren't voiced
  COMMUNITY_ANNOUNCEMENT_ROOT: 9,
  // an open subthread. has parent, top-level (not sidebar), and visible to all
  // members of parent. root ancestor is a COMMUNITY_ROOT
  COMMUNITY_OPEN_SUBTHREAD: 3,
  // like COMMUNITY_SECRET_SUBTHREAD, but members aren't voiced
  COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD: 10,
  // a secret subthread. optional parent, top-level (not sidebar), visible only
  // to its members. root ancestor is a COMMUNITY_ROOT
  COMMUNITY_SECRET_SUBTHREAD: 4,
  // like COMMUNITY_SECRET_SUBTHREAD, but members aren't voiced
  COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD: 11,
  // like COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD, but you can't leave
  GENESIS: 12,
});
export type ThreadType = $Values<typeof threadTypes>;
export function assertThreadType(threadType: number): ThreadType {
  invariant(
    threadType === 3 ||
      threadType === 4 ||
      threadType === 5 ||
      threadType === 6 ||
      threadType === 7 ||
      threadType === 8 ||
      threadType === 9 ||
      threadType === 10 ||
      threadType === 11 ||
      threadType === 12,
    'number is not ThreadType enum',
  );
  return threadType;
}

export const threadTypeValidator: TRefinement<number> = tNumEnum(
  values(threadTypes),
);

export function threadTypeIsCommunityRoot(threadType: ThreadType): boolean {
  return (
    threadType === threadTypes.COMMUNITY_ROOT ||
    threadType === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT ||
    threadType === threadTypes.GENESIS
  );
}

export const threadPermissions = Object.freeze({
  KNOW_OF: 'know_of',
  MEMBERSHIP_DEPRECATED: 'membership',
  VISIBLE: 'visible',
  VOICED: 'voiced',
  EDIT_ENTRIES: 'edit_entries',
  EDIT_THREAD_NAME: 'edit_thread',
  EDIT_THREAD_DESCRIPTION: 'edit_thread_description',
  EDIT_THREAD_COLOR: 'edit_thread_color',
  DELETE_THREAD: 'delete_thread',
  CREATE_SUBTHREADS: 'create_subthreads',
  CREATE_SIDEBARS: 'create_sidebars',
  JOIN_THREAD: 'join_thread',
  EDIT_PERMISSIONS: 'edit_permissions',
  ADD_MEMBERS: 'add_members',
  REMOVE_MEMBERS: 'remove_members',
  CHANGE_ROLE: 'change_role',
  LEAVE_THREAD: 'leave_thread',
});
export type ThreadPermission = $Values<typeof threadPermissions>;

const threadPermissionValidator = t.enums.of(values(threadPermissions));

export function assertThreadPermissions(
  ourThreadPermissions: string,
): ThreadPermission {
  invariant(
    ourThreadPermissions === 'know_of' ||
      ourThreadPermissions === 'membership' ||
      ourThreadPermissions === 'visible' ||
      ourThreadPermissions === 'voiced' ||
      ourThreadPermissions === 'edit_entries' ||
      ourThreadPermissions === 'edit_thread' ||
      ourThreadPermissions === 'edit_thread_description' ||
      ourThreadPermissions === 'edit_thread_color' ||
      ourThreadPermissions === 'delete_thread' ||
      ourThreadPermissions === 'create_subthreads' ||
      ourThreadPermissions === 'create_sidebars' ||
      ourThreadPermissions === 'join_thread' ||
      ourThreadPermissions === 'edit_permissions' ||
      ourThreadPermissions === 'add_members' ||
      ourThreadPermissions === 'remove_members' ||
      ourThreadPermissions === 'change_role' ||
      ourThreadPermissions === 'leave_thread',
    'string is not threadPermissions enum',
  );
  return ourThreadPermissions;
}

export const threadPermissionPropagationPrefixes = Object.freeze({
  DESCENDANT: 'descendant_',
  CHILD: 'child_',
});
export type ThreadPermissionPropagationPrefix = $Values<
  typeof threadPermissionPropagationPrefixes,
>;

export const threadPermissionFilterPrefixes = Object.freeze({
  // includes only SIDEBAR, COMMUNITY_OPEN_SUBTHREAD,
  // COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD
  OPEN: 'open_',
  // excludes only SIDEBAR
  TOP_LEVEL: 'toplevel_',
  // includes only COMMUNITY_OPEN_SUBTHREAD,
  // COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD
  OPEN_TOP_LEVEL: 'opentoplevel_',
});
export type ThreadPermissionFilterPrefix = $Values<
  typeof threadPermissionFilterPrefixes,
>;

export type ThreadPermissionInfo =
  | { +value: true, +source: string }
  | { +value: false, +source: null };

const threadPermissionInfoValidator = t.union([
  tShape({ value: tBool(true), source: tID }),
  tShape({ value: tBool(false), source: t.Nil }),
]);

export type ThreadPermissionsBlob = {
  +[permission: string]: ThreadPermissionInfo,
};
export type ThreadRolePermissionsBlob = { +[permission: string]: boolean };

const threadRolePermissionsBlobValidator = t.dict(t.String, t.Boolean);

export type ThreadPermissionsInfo = {
  +[permission: ThreadPermission]: ThreadPermissionInfo,
};

const threadPermissionsInfoValidator = t.dict(
  threadPermissionValidator,
  threadPermissionInfoValidator,
);

export type MemberInfo = {
  +id: string,
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +isSender: boolean,
};

const memberInfoValidator = tShape({
  id: t.String,
  role: t.maybe(t.String),
  permissions: threadPermissionsInfoValidator,
  isSender: t.Boolean,
});

export type RelativeMemberInfo = {
  ...MemberInfo,
  +username: ?string,
  +isViewer: boolean,
};

export type RoleInfo = {
  +id: string,
  +name: string,
  +permissions: ThreadRolePermissionsBlob,
  +isDefault: boolean,
};

const roleInfoValidator = tShape({
  id: t.String,
  name: t.String,
  permissions: threadRolePermissionsBlobValidator,
  isDefault: t.Boolean,
});

export type ThreadCurrentUserInfo = {
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +subscription: ThreadSubscription,
  +unread: ?boolean,
};

const threadCurrentUserInfoValidator = tShape({
  role: t.maybe(t.String),
  permissions: threadPermissionsInfoValidator,
  subscription: threadSubscriptionValidator,
  unread: t.maybe(t.Boolean),
});

export type RawThreadInfo = {
  +id: string,
  +type: ThreadType,
  +name: ?string,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: $ReadOnlyArray<MemberInfo>,
  +roles: { [id: string]: RoleInfo },
  +currentUser: ThreadCurrentUserInfo,
  +sourceMessageID?: string,
  +repliesCount: number,
};

export const rawThreadInfoValidator: TInterface = tShape({
  id: tID,
  type: threadTypeValidator,
  name: t.maybe(t.String),
  description: t.maybe(t.String),
  color: t.String,
  creationTime: t.Number,
  parentThreadID: t.maybe(tID),
  containingThreadID: t.maybe(tID),
  community: t.maybe(tID),
  members: t.list(memberInfoValidator),
  roles: t.dict(t.String, roleInfoValidator),
  currentUser: threadCurrentUserInfoValidator,
  sourceMessageID: t.maybe(t.String),
  repliesCount: t.Number,
});

export type ThreadInfo = {
  +id: string,
  +type: ThreadType,
  +name: ?string,
  +uiName: string,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: $ReadOnlyArray<RelativeMemberInfo>,
  +roles: { [id: string]: RoleInfo },
  +currentUser: ThreadCurrentUserInfo,
  +sourceMessageID?: string,
  +repliesCount: number,
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
  +type: ThreadType,
  +name: ?string,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +depth: number,
  +members: $ReadOnlyArray<ServerMemberInfo>,
  +roles: { [id: string]: RoleInfo },
  +sourceMessageID?: string,
  +repliesCount: number,
};

export type ThreadStore = {
  +threadInfos: { +[id: string]: RawThreadInfo },
};

export type RemoveThreadOperation = {
  +type: 'remove',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllThreadsOperation = {
  +type: 'remove_all',
};

export type ReplaceThreadOperation = {
  +type: 'replace',
  +payload: { +id: string, +threadInfo: RawThreadInfo },
};

export type ThreadStoreOperation =
  | RemoveThreadOperation
  | RemoveAllThreadsOperation
  | ReplaceThreadOperation;

export type ClientDBThreadInfo = {
  +id: string,
  +type: number,
  +name: ?string,
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
};

export type ClientDBReplaceThreadOperation = {
  +type: 'replace',
  +payload: ClientDBThreadInfo,
};

export type ClientDBThreadStoreOperation =
  | RemoveThreadOperation
  | RemoveAllThreadsOperation
  | ClientDBReplaceThreadOperation;

export type SidebarInfo = {
  +threadInfo: ThreadInfo,
  +lastUpdatedTime: number,
  +mostRecentNonLocalMessage: ?string,
};

// We can show a max of 3 sidebars inline underneath their parent in the chat
// tab. If there are more, we show a button that opens a modal to see the rest
export const maxReadSidebars = 3;

// We can show a max of 5 sidebars inline underneath their parent
// in the chat tab if every one of the displayed sidebars is unread
export const maxUnreadSidebars = 5;
