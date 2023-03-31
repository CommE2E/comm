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
  ThreadFetchMediaRequest,
  ThreadFetchMediaResult,
  ToggleMessagePinRequest,
  ToggleMessagePinResult,
} from '../types/thread-types.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';
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

const removeUsersFromThreadActionTypes = Object.freeze({
  started: 'REMOVE_USERS_FROM_THREAD_STARTED',
  success: 'REMOVE_USERS_FROM_THREAD_SUCCESS',
  failed: 'REMOVE_USERS_FROM_THREAD_FAILED',
});
const removeUsersFromThread =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    threadID: string,
    memberIDs: $ReadOnlyArray<string>,
  ) => Promise<ChangeThreadSettingsPayload>) =>
  async (threadID, memberIDs) => {
    const response = await callServerEndpoint('remove_members', {
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
const changeThreadMemberRoles =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    threadID: string,
    memberIDs: $ReadOnlyArray<string>,
    newRole: string,
  ) => Promise<ChangeThreadSettingsPayload>) =>
  async (threadID, memberIDs, newRole) => {
    const response = await callServerEndpoint('update_role', {
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
const newThread =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((request: ClientNewThreadRequest) => Promise<NewThreadResult>) =>
  async request => {
    const response = await callServerEndpoint('create_thread', request);
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
const joinThread =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((request: ClientThreadJoinRequest) => Promise<ThreadJoinPayload>) =>
  async request => {
    const response = await callServerEndpoint('join_thread', request);
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
const leaveThread =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((threadID: string) => Promise<LeaveThreadPayload>) =>
  async threadID => {
    const response = await callServerEndpoint('leave_thread', { threadID });
    return {
      updatesResult: response.updatesResult,
    };
  };

const fetchThreadMedia =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((request: ThreadFetchMediaRequest) => Promise<ThreadFetchMediaResult>) =>
  async request => {
    const response = await callServerEndpoint('fetch_thread_media', request);
    return response;
  };

const toggleMessagePinActionTypes = Object.freeze({
  started: 'TOGGLE_MESSAGE_PIN_STARTED',
  success: 'TOGGLE_MESSAGE_PIN_SUCCESS',
  failed: 'TOGGLE_MESSAGE_PIN_FAILED',
});
const toggleMessagePin =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((request: ToggleMessagePinRequest) => Promise<ToggleMessagePinResult>) =>
  async request => {
    const response = await callServerEndpoint('toggle_message_pin', request);
    return {
      newMessageInfos: response.newMessageInfos,
      threadID: response.threadID,
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
  fetchThreadMedia,
  toggleMessagePinActionTypes,
  toggleMessagePin,
};
