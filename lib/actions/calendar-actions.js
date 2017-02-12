// @flow

import type { CalendarInfo } from '../types/calendar-types';
import type { VisibilityRules } from '../types/calendar-types';

import fetchJSON from '../utils/fetch-json';
import { visibilityRules } from '../types/calendar-types';

const deleteCalendarActionType = "DELETE_CALENDAR";
async function deleteCalendar(
  calendarID: string,
  currentAccountPassword: string,
) {
  await fetchJSON('delete_calendar.php', {
    'calendar': calendarID,
    'password': currentAccountPassword,
  });
  return calendarID;
}

const changeCalendarSettingsActionType = "CHANGE_CALENDAR_SETTINGS";
async function changeCalendarSettings(
  currentAccountPassword: string,
  newCalendarPassword: string,
  newCalendarInfo: CalendarInfo,
) {
  await fetchJSON('edit_calendar.php', {
    'personal_password': currentAccountPassword,
    'name': newCalendarInfo.name,
    'description': newCalendarInfo.description,
    'calendar': newCalendarInfo.id,
    'visibility_rules': newCalendarInfo.visibilityRules,
    'new_password': newCalendarPassword,
    'color': newCalendarInfo.color,
    'edit_rules': newCalendarInfo.editRules,
  });
  return newCalendarInfo;
}

const newCalendarActionType = "NEW_CALENDAR";
async function newCalendar(
  name: string,
  description: string,
  ourVisibilityRules: VisibilityRules,
  password: string,
  color: string,
): Promise<CalendarInfo> {
  const response = await fetchJSON('new_calendar.php', {
    'name': name,
    'description': description,
    'visibility_rules': ourVisibilityRules,
    'password': password,
    'color': color,
  });
  const newCalendarID = response.new_calendar_id.toString();
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
  calendarID: string,
  calendarPassword: string,
): Promise<CalendarInfo> {
  const response = await fetchJSON('auth_calendar.php', {
    'calendar': calendarID,
    'password': calendarPassword,
  });
  return response.calendar_info;
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
};
