// @flow

import type {
  RawThreadInfo,
  ThreadInfo,
  ChangeThreadSettingsResult,
  LeaveThreadPayload,
  UpdateThreadRequest,
  VisibilityRules,
  DeleteThreadPayload,
  NewThreadRequest,
  NewThreadResult,
  ThreadJoinPayload,
} from '../types/thread-types';
import type { FetchJSON } from '../utils/fetch-json';
import type {
  RawMessageInfo,
  MessageTruncationStatus,
} from '../types/message-types';
import type { UserInfo } from '../types/user-types';

import { visibilityRules } from '../types/thread-types';

const deleteThreadActionTypes = Object.freeze({
  started: "DELETE_THREAD_STARTED",
  success: "DELETE_THREAD_SUCCESS",
  failed: "DELETE_THREAD_FAILED",
});
async function deleteThread(
  fetchJSON: FetchJSON,
  threadID: string,
  currentAccountPassword: string,
): Promise<DeleteThreadPayload> {
  await fetchJSON('delete_thread.php', {
    threadID,
    accountPassword: currentAccountPassword,
  });
  return { threadID };
}

const changeThreadSettingsActionTypes = Object.freeze({
  started: "CHANGE_THREAD_SETTINGS_STARTED",
  success: "CHANGE_THREAD_SETTINGS_SUCCESS",
  failed: "CHANGE_THREAD_SETTINGS_FAILED",
});
async function changeThreadSettings(
  fetchJSON: FetchJSON,
  request: UpdateThreadRequest,
): Promise<ChangeThreadSettingsResult> {
  const response = await fetchJSON('edit_thread.php', request);
  return {
    threadInfo: response.threadInfo,
    newMessageInfos: response.newMessageInfos,
  };
}

const removeUsersFromThreadActionTypes = Object.freeze({
  started: "REMOVE_USERS_FROM_THREAD_STARTED",
  success: "REMOVE_USERS_FROM_THREAD_SUCCESS",
  failed: "REMOVE_USERS_FROM_THREAD_FAILED",
});
async function removeUsersFromThread(
  fetchJSON: FetchJSON,
  threadID: string,
  memberIDs: string[],
): Promise<ChangeThreadSettingsResult> {
  const response = await fetchJSON('remove_members.php', {
    threadID,
    memberIDs,
  });
  return {
    threadInfo: response.threadInfo,
    newMessageInfos: response.newMessageInfos,
  };
}

const changeThreadMemberRolesActionTypes = Object.freeze({
  started: "CHANGE_THREAD_MEMBER_ROLES_STARTED",
  success: "CHANGE_THREAD_MEMBER_ROLES_SUCCESS",
  failed: "CHANGE_THREAD_MEMBER_ROLES_FAILED",
});
async function changeThreadMemberRoles(
  fetchJSON: FetchJSON,
  threadID: string,
  memberIDs: string[],
  newRole: string,
): Promise<ChangeThreadSettingsResult> {
  const response = await fetchJSON('change_role.php', {
    threadID,
    memberIDs,
    role: newRole,
  });
  return {
    threadInfo: response.threadInfo,
    newMessageInfos: response.newMessageInfos,
  };
}

const newThreadActionTypes = Object.freeze({
  started: "NEW_THREAD_STARTED",
  success: "NEW_THREAD_SUCCESS",
  failed: "NEW_THREAD_FAILED",
});
async function newThread(
  fetchJSON: FetchJSON,
  request: NewThreadRequest,
): Promise<NewThreadResult> {
  const response = await fetchJSON('new_thread.php', request);
  return {
    newThreadInfo: response.newThreadInfo,
    newMessageInfos: response.newMessageInfos,
  };
}

const joinThreadActionTypes = Object.freeze({
  started: "JOIN_THREAD_STARTED",
  success: "JOIN_THREAD_SUCCESS",
  failed: "JOIN_THREAD_FAILED",
});
async function joinThread(
  fetchJSON: FetchJSON,
  threadID: string,
  threadPassword?: string,
): Promise<ThreadJoinPayload> {
  const response = await fetchJSON('join_thread.php', {
    threadID,
    password: threadPassword,
  });
  // https://github.com/facebook/flow/issues/2221
  const userInfos: any = Object.values(response.userInfos);
  return {
    threadID,
    threadInfos: response.threadInfos,
    rawMessageInfos: response.rawMessageInfos,
    truncationStatuses: response.truncationStatuses,
    userInfos,
  };
}

const leaveThreadActionTypes = Object.freeze({
  started: "LEAVE_THREAD_STARTED",
  success: "LEAVE_THREAD_SUCCESS",
  failed: "LEAVE_THREAD_FAILED",
});
async function leaveThread(
  fetchJSON: FetchJSON,
  threadID: string,
): Promise<LeaveThreadPayload> {
  const response = await fetchJSON('leave_thread.php', { threadID });
  return { threadID, threadInfos: response.threadInfos };
}

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
