// @flow

import type { ThreadInfo } from '../types/thread-types';
import type { VisibilityRules } from '../types/thread-types';
import type { FetchJSON } from '../utils/fetch-json';

import { visibilityRules } from '../types/thread-types';

const deleteThreadActionType = "DELETE_CALENDAR";
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

const changeThreadSettingsActionType = "CHANGE_CALENDAR_SETTINGS";
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

const newThreadActionType = "NEW_CALENDAR";
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

const authThreadActionType = "AUTH_CALENDAR";
async function authThread(
  fetchJSON: FetchJSON,
  threadID: string,
  threadPassword: string,
): Promise<ThreadInfo> {
  const response = await fetchJSON('auth_thread.php', {
    'thread': threadID,
    'password': threadPassword,
  });
  return response.thread_info;
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
