// @flow

import type { BaseAppState } from '../types/redux-types';
import type { EntryInfo } from '../types/entry-types';

import fetchJSON from '../utils/fetch-json';

const fetchAllEntriesForDayActionType = "FETCH_ALL_DAY_ENTRIES";
async function fetchAllEntriesForDay(
  year: number,
  month: number,
  day: number,
  navID: string,
) {
  const response = await fetchJSON('day_history.php', {
    'year': year,
    'month': month,
    'day': day,
    'nav': navID,
  });
  return response.result;
}

const fetchEntriesForMonthActionType = "FETCH_MONTH_ENTRIES";
async function fetchEntriesForMonth(
  year: number,
  month: number,
  navID: string,
) {
  const response = await fetchJSON('month_entries.php', {
    'month': month,
    'year': year,
    'nav': navID,
  });
  return response.result;
}

const createLocalEntryActionType = "CREATE_LOCAL_ENTRY";
let curLocalID = 0;
function createLocalEntry(
  calendarID: string,
  year: number,
  month: number,
  day: number,
  creator: ?string,
) {
  const newEntryInfo: EntryInfo = {
    localID: `local${curLocalID++}`,
    calendarID,
    text: "",
    year,
    month,
    day,
    creationTime: Date.now(),
    creator,
    deleted: false,
  };
  return newEntryInfo;
}

const saveEntryActionType = "SAVE_ENTRY";
const concurrentModificationResetActionType = "CONCURRENT_MODIFICATION_RESET";
async function saveEntry(
  serverID: ?string,
  newText: string,
  prevText: string,
  sessionID: string,
  year: number,
  month: number,
  day: number,
  calendarID: string,
  creationTime: number,
) {
  const entryID = serverID ? serverID : "-1";
  const payload: Object = {
    'text': newText,
    'prev_text': prevText,
    'session_id': sessionID,
    'entry_id': entryID,
  };
  if (!serverID) {
    payload['day'] = day;
    payload['month'] = month;
    payload['year'] = year;
    payload['calendar'] = calendarID;
    payload['timestamp'] = creationTime;
  } else {
    payload['timestamp'] = Date.now();
  }
  return await fetchJSON('save.php', payload);
}

const deleteEntryActionType = "DELETE_ENTRY";
async function deleteEntry(
  serverID: string,
  prevText: string,
  sessionID: string,
) {
  await fetchJSON('delete_entry.php', {
    'id': serverID,
    'prev_text': prevText,
    'session_id': sessionID,
    'timestamp': Date.now(),
  });
}

export {
  fetchAllEntriesForDayActionType,
  fetchAllEntriesForDay,
  fetchEntriesForMonthActionType,
  fetchEntriesForMonth,
  createLocalEntryActionType,
  createLocalEntry,
  saveEntryActionType,
  concurrentModificationResetActionType,
  saveEntry,
  deleteEntryActionType,
  deleteEntry,
};
