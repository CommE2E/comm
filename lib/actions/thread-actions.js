// @flow

import type { ThreadInfo } from '../types/thread-types';
import type { VisibilityRules } from '../types/thread-types';
import type { FetchJSON } from '../utils/fetch-json';
import type {
  RawThreadCreationInfo,
  RawSubThreadCreationInfo,
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

export type ChangeThreadSettingsResult = {|
  threadInfo: ThreadInfo,
  newMessageInfos: RawMessageInfo[],
|};
const changeThreadSettingsActionTypes = {
  started: "CHANGE_THREAD_SETTINGS_STARTED",
  success: "CHANGE_THREAD_SETTINGS_SUCCESS",
  failed: "CHANGE_THREAD_SETTINGS_FAILED",
};
async function changeThreadSettings(
  fetchJSON: FetchJSON,
  currentAccountPassword: string,
  newThreadInfo: ThreadInfo,
  newThreadPassword: ?string,
): Promise<ChangeThreadSettingsResult> {
  const requestData: Object = {
    'personal_password': currentAccountPassword,
    'name': newThreadInfo.name,
    'description': newThreadInfo.description,
    'thread': newThreadInfo.id,
    'visibility_rules': newThreadInfo.visibilityRules,
    'color': newThreadInfo.color,
    'edit_rules': newThreadInfo.editRules,
  };
  if (newThreadPassword !== null && newThreadPassword !== undefined) {
    requestData.new_password = newThreadPassword;
  }
  const response = await fetchJSON('edit_thread.php', requestData);
  return {
    threadInfo: response.thread_info,
    newMessageInfos: response.new_message_infos,
  };
}

const addUsersToThreadActionTypes = {
  started: "ADD_USERS_TO_THREAD_STARTED",
  success: "ADD_USERS_TO_THREAD_SUCCESS",
  failed: "ADD_USERS_TO_THREAD_FAILED",
};
async function addUsersToThread(
  fetchJSON: FetchJSON,
  threadID: string,
  userIDs: string[],
): Promise<ChangeThreadSettingsResult> {
  const response = await fetchJSON('edit_thread.php', {
    'thread': threadID,
    'add_member_ids': userIDs,
  });
  return {
    threadInfo: response.thread_info,
    newMessageInfos: response.new_message_infos,
  };
}

type RawCreationInfo = RawThreadCreationInfo | RawSubThreadCreationInfo;
export type NewThreadResult = {|
  newThreadInfo: ThreadInfo,
  newMessageInfos: RawCreationInfo[],
|};
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
): Promise<NewThreadResult> {
  const response = await fetchJSON('new_thread.php', {
    'name': name,
    'description': description,
    'visibility_rules': ourVisibilityRules,
    'password': password,
    'color': color,
  });
  return {
    newThreadInfo: response.new_thread_info,
    newMessageInfos: response.new_message_infos,
  };
}
async function newChatThread(
  fetchJSON: FetchJSON,
  name: string,
  ourVisibilityRules: VisibilityRules,
  color: string,
  userIDs: string[],
  parentThreadID: ?string,
): Promise<NewThreadResult> {
  const request: Object = {
    'name': name,
    'description': "",
    'visibility_rules': ourVisibilityRules,
    'color': color,
    'initial_member_ids': userIDs,
  };
  if (parentThreadID) {
    request.parent_thread_id = parentThreadID;
  }
  const response = await fetchJSON('new_thread.php', request);
  return {
    newThreadInfo: response.new_thread_info,
    newMessageInfos: response.new_message_infos,
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
  addUsersToThreadActionTypes,
  addUsersToThread,
  newThreadActionTypes,
  newThread,
  newChatThread,
  joinThreadActionTypes,
  joinThread,
  subscribeActionTypes,
  subscribe,
};
