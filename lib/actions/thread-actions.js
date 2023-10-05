// @flow

import invariant from 'invariant';

import genesis from '../facts/genesis.js';
import type {
  ChangeThreadSettingsPayload,
  LeaveThreadPayload,
  UpdateThreadRequest,
  ClientNewThreadRequest,
  NewThreadResult,
  ClientThreadJoinRequest,
  ThreadJoinPayload,
  ThreadFetchMediaRequest,
  ThreadFetchMediaResult,
  RoleModificationRequest,
  RoleModificationPayload,
  RoleDeletionRequest,
  RoleDeletionPayload,
} from '../types/thread-types.js';
import { extractKeyserverIDFromID } from '../utils/action-utils.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';
import type { CallKeyserverEndpoint } from '../utils/keyserver-call';
import { useKeyserverCall } from '../utils/keyserver-call.js';
import { values } from '../utils/objects.js';

const deleteThreadActionTypes = Object.freeze({
  started: 'DELETE_THREAD_STARTED',
  success: 'DELETE_THREAD_SUCCESS',
  failed: 'DELETE_THREAD_FAILED',
});
const deleteThread =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    threadID: string,
    currentAccountPassword: ?string,
  ) => Promise<LeaveThreadPayload>) =>
  async (threadID, currentAccountPassword) => {
    const response = await callServerEndpoint('delete_thread', {
      threadID,
      accountPassword: currentAccountPassword,
    });
    return {
      updatesResult: response.updatesResult,
    };
  };

const changeThreadSettingsActionTypes = Object.freeze({
  started: 'CHANGE_THREAD_SETTINGS_STARTED',
  success: 'CHANGE_THREAD_SETTINGS_SUCCESS',
  failed: 'CHANGE_THREAD_SETTINGS_FAILED',
});
const changeThreadSettings =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((request: UpdateThreadRequest) => Promise<ChangeThreadSettingsPayload>) =>
  async request => {
    invariant(
      Object.keys(request.changes).length > 0,
      'No changes provided to changeThreadSettings!',
    );
    const response = await callServerEndpoint('update_thread', request);
    return {
      threadID: request.threadID,
      updatesResult: response.updatesResult,
      newMessageInfos: response.newMessageInfos,
    };
  };

export type RemoveUsersFromThreadInput = {
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
};

const removeUsersFromThreadActionTypes = Object.freeze({
  started: 'REMOVE_USERS_FROM_THREAD_STARTED',
  success: 'REMOVE_USERS_FROM_THREAD_SUCCESS',
  failed: 'REMOVE_USERS_FROM_THREAD_FAILED',
});
const removeUsersFromThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: RemoveUsersFromThreadInput,
  ) => Promise<ChangeThreadSettingsPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const response = (await callKeyserverEndpoint('remove_members', requests))[
      keyserverID
    ];
    return {
      threadID: input.threadID,
      updatesResult: response.updatesResult,
      newMessageInfos: response.newMessageInfos,
    };
  };

function useRemoveUsersFromThread(): (
  input: RemoveUsersFromThreadInput,
) => Promise<ChangeThreadSettingsPayload> {
  return useKeyserverCall(removeUsersFromThread);
}

export type ChangeThreadMemberRolesInput = {
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
  +newRole: string,
};

const changeThreadMemberRolesActionTypes = Object.freeze({
  started: 'CHANGE_THREAD_MEMBER_ROLES_STARTED',
  success: 'CHANGE_THREAD_MEMBER_ROLES_SUCCESS',
  failed: 'CHANGE_THREAD_MEMBER_ROLES_FAILED',
});
const changeThreadMemberRoles =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: ChangeThreadMemberRolesInput,
  ) => Promise<ChangeThreadSettingsPayload>) =>
  async input => {
    const { threadID, memberIDs, newRole } = input;
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = {
      [keyserverID]: {
        threadID,
        memberIDs,
        role: newRole,
      },
    };

    const response = (await callKeyserverEndpoint('update_role', requests))[
      keyserverID
    ];
    return {
      threadID,
      updatesResult: response.updatesResult,
      newMessageInfos: response.newMessageInfos,
    };
  };

function useChangeThreadMemberRoles(): (
  input: ChangeThreadMemberRolesInput,
) => Promise<ChangeThreadSettingsPayload> {
  return useKeyserverCall(changeThreadMemberRoles);
}

const newThreadActionTypes = Object.freeze({
  started: 'NEW_THREAD_STARTED',
  success: 'NEW_THREAD_SUCCESS',
  failed: 'NEW_THREAD_FAILED',
});
const newThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: ClientNewThreadRequest) => Promise<NewThreadResult>) =>
  async input => {
    const parentThreadID = input.parentThreadID ?? genesis.id;
    const keyserverID = extractKeyserverIDFromID(parentThreadID);
    const requests = { [keyserverID]: input };

    const response = (await callKeyserverEndpoint('create_thread', requests))[
      keyserverID
    ];

    return {
      newThreadID: response.newThreadID,
      updatesResult: response.updatesResult,
      newMessageInfos: response.newMessageInfos,
      userInfos: response.userInfos,
    };
  };

function useNewThread(): (
  input: ClientNewThreadRequest,
) => Promise<NewThreadResult> {
  return useKeyserverCall(newThread);
}

const joinThreadActionTypes = Object.freeze({
  started: 'JOIN_THREAD_STARTED',
  success: 'JOIN_THREAD_SUCCESS',
  failed: 'JOIN_THREAD_FAILED',
});
const joinThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: ClientThreadJoinRequest) => Promise<ThreadJoinPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const response = (await callKeyserverEndpoint('join_thread', requests))[
      keyserverID
    ];
    const userInfos = values(response.userInfos);
    return {
      updatesResult: response.updatesResult,
      rawMessageInfos: response.rawMessageInfos,
      truncationStatuses: response.truncationStatuses,
      userInfos,
    };
  };

function useJoinThread(): (
  input: ClientThreadJoinRequest,
) => Promise<ThreadJoinPayload> {
  return useKeyserverCall(joinThread);
}

export type LeaveThreadInput = {
  +threadID: string,
};
const leaveThreadActionTypes = Object.freeze({
  started: 'LEAVE_THREAD_STARTED',
  success: 'LEAVE_THREAD_SUCCESS',
  failed: 'LEAVE_THREAD_FAILED',
});
const leaveThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: LeaveThreadInput) => Promise<LeaveThreadPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const response = (await callKeyserverEndpoint('leave_thread', requests))[
      keyserverID
    ];
    return {
      updatesResult: response.updatesResult,
    };
  };

function useLeaveThread(): (
  input: LeaveThreadInput,
) => Promise<LeaveThreadPayload> {
  return useKeyserverCall(leaveThread);
}

const fetchThreadMedia =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: ThreadFetchMediaRequest) => Promise<ThreadFetchMediaResult>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const response = (
      await callKeyserverEndpoint('fetch_thread_media', requests)
    )[keyserverID];
    return { media: response.media };
  };

function useFetchThreadMedia(): (
  input: ThreadFetchMediaRequest,
) => Promise<ThreadFetchMediaResult> {
  return useKeyserverCall(fetchThreadMedia);
}

const modifyCommunityRoleActionTypes = Object.freeze({
  started: 'MODIFY_COMMUNITY_ROLE_STARTED',
  success: 'MODIFY_COMMUNITY_ROLE_SUCCESS',
  failed: 'MODIFY_COMMUNITY_ROLE_FAILED',
});
const modifyCommunityRole =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: RoleModificationRequest) => Promise<RoleModificationPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.community);
    const requests = { [keyserverID]: input };

    const response = (
      await callKeyserverEndpoint('modify_community_role', requests)
    )[keyserverID];
    return {
      threadInfo: response.threadInfo,
      updatesResult: response.updatesResult,
    };
  };

function useModifyCommunityRole(): (
  input: RoleModificationRequest,
) => Promise<RoleModificationPayload> {
  return useKeyserverCall(modifyCommunityRole);
}

const deleteCommunityRoleActionTypes = Object.freeze({
  started: 'DELETE_COMMUNITY_ROLE_STARTED',
  success: 'DELETE_COMMUNITY_ROLE_SUCCESS',
  failed: 'DELETE_COMMUNITY_ROLE_FAILED',
});
const deleteCommunityRole =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: RoleDeletionRequest) => Promise<RoleDeletionPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.community);
    const requests = { [keyserverID]: input };

    const response = (
      await callKeyserverEndpoint('delete_community_role', requests)
    )[keyserverID];
    return {
      threadInfo: response.threadInfo,
      updatesResult: response.updatesResult,
    };
  };

function useDeleteCommunityRole(): (
  input: RoleDeletionRequest,
) => Promise<RoleDeletionPayload> {
  return useKeyserverCall(deleteCommunityRole);
}

export {
  deleteThreadActionTypes,
  deleteThread,
  changeThreadSettingsActionTypes,
  changeThreadSettings,
  removeUsersFromThreadActionTypes,
  useRemoveUsersFromThread,
  changeThreadMemberRolesActionTypes,
  useChangeThreadMemberRoles,
  newThreadActionTypes,
  useNewThread,
  joinThreadActionTypes,
  useJoinThread,
  leaveThreadActionTypes,
  useLeaveThread,
  useFetchThreadMedia,
  modifyCommunityRoleActionTypes,
  useModifyCommunityRole,
  deleteCommunityRoleActionTypes,
  useDeleteCommunityRole,
};
