// @flow

import type { CalendarInfo } from '../types/calendar-types';

import fetchJSON from '../utils/fetch-json';

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

export {
  deleteCalendarActionType,
  deleteCalendar,
  changeCalendarSettingsActionType,
  changeCalendarSettings,
};
