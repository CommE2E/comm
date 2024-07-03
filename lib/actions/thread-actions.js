// @flow

import invariant from 'invariant';

import genesis from '../facts/genesis.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import { permissionsAndAuthRelatedRequestTimeout } from '../shared/timeouts.js';
import type {
  ChangeThreadSettingsPayload,
  LeaveThreadPayload,
  UpdateThreadRequest,
  ClientNewThinThreadRequest,
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
import { values } from '../utils/objects.js';

export type DeleteThreadInput = {
  +threadID: string,
};

const deleteThreadActionTypes = Object.freeze({
  started: 'DELETE_THREAD_STARTED',
  success: 'DELETE_THREAD_SUCCESS',
  failed: 'DELETE_THREAD_FAILED',
});

const deleteThreadEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};

const deleteThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: DeleteThreadInput) => Promise<LeaveThreadPayload>) =>
  async input => {
    const optionalKeyserverID = extractKeyserverIDFromID(input.threadID);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    const keyserverID: string = optionalKeyserverID;
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'delete_thread',
      requests,
      deleteThreadEndpointOptions,
    );
    const response = responses[keyserverID];
    return {
      updatesResult: response.updatesResult,
    };
  };

function useDeleteThread(): (
  input: DeleteThreadInput,
) => Promise<LeaveThreadPayload> {
  return useKeyserverCall(deleteThread);
}
const changeThreadSettingsActionTypes = Object.freeze({
  started: 'CHANGE_THREAD_SETTINGS_STARTED',
  success: 'CHANGE_THREAD_SETTINGS_SUCCESS',
  failed: 'CHANGE_THREAD_SETTINGS_FAILED',
});

const changeThreadSettingsEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};

const changeThreadSettings =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: UpdateThreadRequest) => Promise<ChangeThreadSettingsPayload>) =>
  async input => {
    invariant(
      Object.keys(input.changes).length > 0,
      'No changes provided to changeThreadSettings!',
    );
    const optionalKeyserverID = extractKeyserverIDFromID(input.threadID);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    const keyserverID: string = optionalKeyserverID;
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'update_thread',
      requests,
      changeThreadSettingsEndpointOptions,
    );
    const response = responses[keyserverID];
    return {
      threadID: input.threadID,
      updatesResult: response.updatesResult,
      newMessageInfos: response.newMessageInfos,
    };
  };

function useChangeThreadSettings(): (
  input: UpdateThreadRequest,
) => Promise<ChangeThreadSettingsPayload> {
  return useKeyserverCall(changeThreadSettings);
}

export type RemoveUsersFromThreadInput = {
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
};

const removeUsersFromThreadActionTypes = Object.freeze({
  started: 'REMOVE_USERS_FROM_THREAD_STARTED',
  success: 'REMOVE_USERS_FROM_THREAD_SUCCESS',
  failed: 'REMOVE_USERS_FROM_THREAD_FAILED',
});

const removeMembersFromThreadEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};

const removeUsersFromThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: RemoveUsersFromThreadInput,
  ) => Promise<ChangeThreadSettingsPayload>) =>
  async input => {
    const optionalKeyserverID = extractKeyserverIDFromID(input.threadID);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    const keyserverID: string = optionalKeyserverID;
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'remove_members',
      requests,
      removeMembersFromThreadEndpointOptions,
    );
    const response = responses[keyserverID];
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

const changeThreadMemberRoleEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};

const changeThreadMemberRoles =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: ChangeThreadMemberRolesInput,
  ) => Promise<ChangeThreadSettingsPayload>) =>
  async input => {
    const { threadID, memberIDs, newRole } = input;
    const optionalKeyserverID = extractKeyserverIDFromID(input.threadID);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    const keyserverID: string = optionalKeyserverID;
    const requests = {
      [keyserverID]: {
        threadID,
        memberIDs,
        role: newRole,
      },
    };

    const responses = await callKeyserverEndpoint(
      'update_role',
      requests,
      changeThreadMemberRoleEndpointOptions,
    );
    const response = responses[keyserverID];
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
const newThinThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: ClientNewThinThreadRequest) => Promise<NewThreadResult>) =>
  async input => {
    const parentThreadID = input.parentThreadID ?? genesis().id;
    const optionalKeyserverID = extractKeyserverIDFromID(parentThreadID);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    const keyserverID: string = optionalKeyserverID;
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint('create_thread', requests);
    const response = responses[keyserverID];

    return {
      newThreadID: response.newThreadID,
      updatesResult: response.updatesResult,
      newMessageInfos: response.newMessageInfos,
      userInfos: response.userInfos,
    };
  };

function useNewThinThread(): (
  input: ClientNewThinThreadRequest,
) => Promise<NewThreadResult> {
  return useKeyserverCall(newThinThread);
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
    const optionalKeyserverID = extractKeyserverIDFromID(input.threadID);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    const keyserverID: string = optionalKeyserverID;
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint('join_thread', requests);
    const response = responses[keyserverID];
    const userInfos = values(response.userInfos);
    return {
      updatesResult: response.updatesResult,
      rawMessageInfos: response.rawMessageInfos,
      truncationStatuses: response.truncationStatuses,
      userInfos,
      keyserverID,
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
    const optionalKeyserverID = extractKeyserverIDFromID(input.threadID);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    const keyserverID: string = optionalKeyserverID;
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint('leave_thread', requests);
    const response = responses[keyserverID];
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
    const optionalKeyserverID = extractKeyserverIDFromID(input.threadID);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    const keyserverID: string = optionalKeyserverID;
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'fetch_thread_media',
      requests,
    );
    const response = responses[keyserverID];
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
    const optionalKeyserverID = extractKeyserverIDFromID(input.community);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    const keyserverID: string = optionalKeyserverID;
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'modify_community_role',
      requests,
    );
    const response = responses[keyserverID];
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
    const optionalKeyserverID = extractKeyserverIDFromID(input.community);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    const keyserverID: string = optionalKeyserverID;
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'delete_community_role',
      requests,
    );
    const response = responses[keyserverID];
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
  useDeleteThread,
  changeThreadSettingsActionTypes,
  useChangeThreadSettings,
  removeUsersFromThreadActionTypes,
  useRemoveUsersFromThread,
  changeThreadMemberRolesActionTypes,
  useChangeThreadMemberRoles,
  newThreadActionTypes,
  useNewThinThread,
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
