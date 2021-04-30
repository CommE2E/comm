// @flow

import invariant from 'invariant';

import type {
  ChangeThreadSettingsPayload,
  LeaveThreadPayload,
  UpdateThreadRequest,
  ClientNewThreadRequest,
  NewThreadResult,
  ClientThreadJoinRequest,
  ThreadJoinPayload,
} from '../types/thread-types';
import type { FetchJSON } from '../utils/fetch-json';
import { values } from '../utils/objects';

const deleteThreadActionTypes = Object.freeze({
  started: 'DELETE_THREAD_STARTED',
  success: 'DELETE_THREAD_SUCCESS',
  failed: 'DELETE_THREAD_FAILED',
});
const deleteThread = (fetchJSON: FetchJSON) => async (
  threadID: string,
  currentAccountPassword: string,
): Promise<LeaveThreadPayload> => {
  const response = await fetchJSON('delete_thread', {
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
const changeThreadSettings = (fetchJSON: FetchJSON) => async (
  request: UpdateThreadRequest,
): Promise<ChangeThreadSettingsPayload> => {
  const response = await fetchJSON('update_thread', request);
  invariant(
    Object.keys(request.changes).length > 0,
    'No changes provided to changeThreadSettings!',
  );
  return {
    threadID: request.threadID,
    updatesResult: response.updatesResult,
    newMessageInfos: response.newMessageInfos,
  };
};

const removeUsersFromThreadActionTypes = Object.freeze({
  started: 'REMOVE_USERS_FROM_THREAD_STARTED',
  success: 'REMOVE_USERS_FROM_THREAD_SUCCESS',
  failed: 'REMOVE_USERS_FROM_THREAD_FAILED',
});
const removeUsersFromThread = (fetchJSON: FetchJSON) => async (
  threadID: string,
  memberIDs: string[],
): Promise<ChangeThreadSettingsPayload> => {
  const response = await fetchJSON('remove_members', {
    threadID,
    memberIDs,
  });
  return {
    threadID,
    updatesResult: response.updatesResult,
    newMessageInfos: response.newMessageInfos,
  };
};

const changeThreadMemberRolesActionTypes = Object.freeze({
  started: 'CHANGE_THREAD_MEMBER_ROLES_STARTED',
  success: 'CHANGE_THREAD_MEMBER_ROLES_SUCCESS',
  failed: 'CHANGE_THREAD_MEMBER_ROLES_FAILED',
});
const changeThreadMemberRoles = (fetchJSON: FetchJSON) => async (
  threadID: string,
  memberIDs: string[],
  newRole: string,
): Promise<ChangeThreadSettingsPayload> => {
  const response = await fetchJSON('update_role', {
    threadID,
    memberIDs,
    role: newRole,
  });
  return {
    threadID,
    updatesResult: response.updatesResult,
    newMessageInfos: response.newMessageInfos,
  };
};

const newThreadActionTypes = Object.freeze({
  started: 'NEW_THREAD_STARTED',
  success: 'NEW_THREAD_SUCCESS',
  failed: 'NEW_THREAD_FAILED',
});
const newThread = (fetchJSON: FetchJSON) => async (
  request: ClientNewThreadRequest,
): Promise<NewThreadResult> => {
  const response = await fetchJSON('create_thread', request);
  return {
    newThreadID: response.newThreadID,
    updatesResult: response.updatesResult,
    newMessageInfos: response.newMessageInfos,
    userInfos: response.userInfos,
  };
};

const joinThreadActionTypes = Object.freeze({
  started: 'JOIN_THREAD_STARTED',
  success: 'JOIN_THREAD_SUCCESS',
  failed: 'JOIN_THREAD_FAILED',
});
const joinThread = (fetchJSON: FetchJSON) => async (
  request: ClientThreadJoinRequest,
): Promise<ThreadJoinPayload> => {
  const response = await fetchJSON('join_thread', request);
  const userInfos = values(response.userInfos);
  return {
    updatesResult: response.updatesResult,
    rawMessageInfos: response.rawMessageInfos,
    truncationStatuses: response.truncationStatuses,
    userInfos,
  };
};

const leaveThreadActionTypes = Object.freeze({
  started: 'LEAVE_THREAD_STARTED',
  success: 'LEAVE_THREAD_SUCCESS',
  failed: 'LEAVE_THREAD_FAILED',
});
const leaveThread = (fetchJSON: FetchJSON) => async (
  threadID: string,
): Promise<LeaveThreadPayload> => {
  const response = await fetchJSON('leave_thread', { threadID });
  return {
    updatesResult: response.updatesResult,
  };
};

export {
  deleteThreadActionTypes,
  deleteThread,
  changeThreadSettingsActionTypes,
  changeThreadSettings,
  removeUsersFromThreadActionTypes,
  removeUsersFromThread,
  changeThreadMemberRolesActionTypes,
  changeThreadMemberRoles,
  newThreadActionTypes,
  newThread,
  joinThreadActionTypes,
  joinThread,
  leaveThreadActionTypes,
  leaveThread,
};
