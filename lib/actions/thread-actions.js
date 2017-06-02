// @flow

import type { ThreadInfo } from '../types/thread-types';
import type { VisibilityRules } from '../types/thread-types';
import type { FetchJSON } from '../utils/fetch-json';
import type {
  MessageInfo,
  MessageTruncationStatus,
} from '../types/message-types';

import { visibilityRules } from '../types/thread-types';

const deleteThreadActionType = "DELETE_THREAD";
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

const changeThreadSettingsActionType = "CHANGE_THREAD_SETTINGS";
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

const newThreadActionType = "NEW_THREAD";
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
  };
}

export type AuthThreadResult = {
  threadInfo: ThreadInfo,
  messageInfos: MessageInfo[],
  truncationStatus: MessageTruncationStatus,
};
const authThreadActionType = "AUTH_THREAD";
async function authThread(
  fetchJSON: FetchJSON,
  threadID: string,
  threadPassword: string,
): Promise<AuthThreadResult> {
  const response = await fetchJSON('auth_thread.php', {
    'thread': threadID,
    'password': threadPassword,
  });
  return {
    threadInfo: response.thread_info,
    messageInfos: response.message_infos,
    truncationStatus: response.truncation_status,
  };
}

const subscribeActionType = "SUBSCRIBE";
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
  deleteThreadActionType,
  deleteThread,
  changeThreadSettingsActionType,
  changeThreadSettings,
  newThreadActionType,
  newThread,
  authThreadActionType,
  authThread,
  subscribeActionType,
  subscribe,
};
