// @flow

import type { ThreadInfo } from '../types/thread-types';
import type { VisibilityRules } from '../types/thread-types';
import type { FetchJSON } from '../utils/fetch-json';
import type {
  RawMessageInfo,
  MessageTruncationStatus,
} from '../types/message-types';
import type { UserInfo } from '../types/user-types';

import { visibilityRules } from '../types/thread-types';

const deleteThreadActionTypes = {
  started: "DELETE_THREAD_STARTED",
  success: "DELETE_THREAD_SUCCESS",
  failed: "DELETE_THREAD_FAILED",
};
async function deleteThread(
  fetchJSON: FetchJSON,
  threadID: string,
  currentAccountPassword: string,
): Promise<string> {
  await fetchJSON('delete_thread.php', {
    'thread': threadID,
    'password': currentAccountPassword,
  });
  return threadID;
}

const changeThreadSettingsActionTypes = {
  started: "CHANGE_THREAD_SETTINGS_STARTED",
  success: "CHANGE_THREAD_SETTINGS_SUCCESS",
  failed: "CHANGE_THREAD_SETTINGS_FAILED",
};
async function changeThreadSettings(
  fetchJSON: FetchJSON,
  currentAccountPassword: string,
  newThreadPassword: string,
  newThreadInfo: ThreadInfo,
): Promise<ThreadInfo> {
  await fetchJSON('edit_thread.php', {
    'personal_password': currentAccountPassword,
    'name': newThreadInfo.name,
    'description': newThreadInfo.description,
    'thread': newThreadInfo.id,
    'visibility_rules': newThreadInfo.visibilityRules,
    'new_password': newThreadPassword,
    'color': newThreadInfo.color,
    'edit_rules': newThreadInfo.editRules,
  });
  return newThreadInfo;
}

const newThreadActionTypes = {
  started: "NEW_THREAD_STARTED",
  success: "NEW_THREAD_SUCCESS",
  failed: "NEW_THREAD_FAILED",
};
async function newThread(
  fetchJSON: FetchJSON,
  name: string,
  description: string,
  ourVisibilityRules: VisibilityRules,
  password: string,
  color: string,
): Promise<ThreadInfo> {
  const response = await fetchJSON('new_thread.php', {
    'name': name,
    'description': description,
    'visibility_rules': ourVisibilityRules,
    'password': password,
    'color': color,
  });
  const newThreadID = response.new_thread_id.toString();
  return {
    id: newThreadID,
    name,
    description,
    authorized: true,
    subscribed: true,
    canChangeSettings: true,
    visibilityRules: ourVisibilityRules,
    color,
    editRules: ourVisibilityRules >= visibilityRules.CLOSED ? 1 : 0,
    creationTime: response.creation_time,
  };
}

export type JoinThreadResult = {|
  threadID: string,
  threadInfos: {[id: string]: ThreadInfo},
  messageInfos: RawMessageInfo[],
  truncationStatus: {[threadID: string]: MessageTruncationStatus},
  userInfos: UserInfo[],
|};
const joinThreadActionTypes = {
  started: "JOIN_THREAD_STARTED",
  success: "JOIN_THREAD_SUCCESS",
  failed: "JOIN_THREAD_FAILED",
};
async function joinThread(
  fetchJSON: FetchJSON,
  threadID: string,
  threadPassword: string,
): Promise<JoinThreadResult> {
  const response = await fetchJSON('join_thread.php', {
    'thread': threadID,
    'password': threadPassword,
  });
  return {
    threadID,
    threadInfos: response.thread_infos,
    messageInfos: response.message_infos,
    truncationStatus: response.truncation_status,
    userInfos: response.user_infos,
  };
}

const subscribeActionTypes = {
  started: "SUBSCRIBE_STARTED",
  success: "SUBSCRIBE_SUCCESS",
  failed: "SUBSCRIBE_FAILED",
};
async function subscribe(
  fetchJSON: FetchJSON,
  threadID: string,
  newSubscribed: bool,
): Promise<void> {
  await fetchJSON('subscribe.php', {
    'thread': threadID,
    'subscribe': newSubscribed ? 1 : 0,
  });
}

export {
  deleteThreadActionTypes,
  deleteThread,
  changeThreadSettingsActionTypes,
  changeThreadSettings,
  newThreadActionTypes,
  newThread,
  joinThreadActionTypes,
  joinThread,
  subscribeActionTypes,
  subscribe,
};
