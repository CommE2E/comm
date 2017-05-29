// @flow

import type { CalendarInfo } from '../types/calendar-types';
import type { VisibilityRules } from '../types/calendar-types';
import type { FetchJSON } from '../utils/fetch-json';

import { visibilityRules } from '../types/calendar-types';

const deleteCalendarActionType = "DELETE_CALENDAR";
async function deleteCalendar(
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

const changeCalendarSettingsActionType = "CHANGE_CALENDAR_SETTINGS";
async function changeCalendarSettings(
  fetchJSON: FetchJSON,
  currentAccountPassword: string,
  newCalendarPassword: string,
  newCalendarInfo: CalendarInfo,
): Promise<CalendarInfo> {
  await fetchJSON('edit_thread.php', {
    'personal_password': currentAccountPassword,
    'name': newCalendarInfo.name,
    'description': newCalendarInfo.description,
    'thread': newCalendarInfo.id,
    'visibility_rules': newCalendarInfo.visibilityRules,
    'new_password': newCalendarPassword,
    'color': newCalendarInfo.color,
    'edit_rules': newCalendarInfo.editRules,
  });
  return newCalendarInfo;
}

const newCalendarActionType = "NEW_CALENDAR";
async function newCalendar(
  fetchJSON: FetchJSON,
  name: string,
  description: string,
  ourVisibilityRules: VisibilityRules,
  password: string,
  color: string,
): Promise<CalendarInfo> {
  const response = await fetchJSON('new_thread.php', {
    'name': name,
    'description': description,
    'visibility_rules': ourVisibilityRules,
    'password': password,
    'color': color,
  });
  const newCalendarID = response.new_thread_id.toString();
  return {
    id: newCalendarID,
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

const authCalendarActionType = "AUTH_CALENDAR";
async function authCalendar(
  fetchJSON: FetchJSON,
  threadID: string,
  calendarPassword: string,
): Promise<CalendarInfo> {
  const response = await fetchJSON('auth_thread.php', {
    'thread': threadID,
    'password': calendarPassword,
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
  deleteCalendarActionType,
  deleteCalendar,
  changeCalendarSettingsActionType,
  changeCalendarSettings,
  newCalendarActionType,
  newCalendar,
  authCalendarActionType,
  authCalendar,
  subscribeActionType,
  subscribe,
};
