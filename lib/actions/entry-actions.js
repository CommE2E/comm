// @flow

import type { BaseAppState } from '../types/redux-types';
import type { EntryInfo } from '../types/entry-types';
import type { FetchJSON } from '../utils/fetch-json';
import type { HistoryRevisionInfo } from '../types/history-types';

const fetchAllEntriesForDayActionType = "FETCH_ALL_DAY_ENTRIES";
async function fetchAllEntriesForDay(
  fetchJSON: FetchJSON,
  year: number,
  month: number,
  day: number,
  navID: string,
): Promise<EntryInfo[]> {
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
  fetchJSON: FetchJSON,
  year: number,
  month: number,
  navID: string,
): Promise<EntryInfo[]> {
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
): EntryInfo {
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

export type SaveResult = {
  'success': bool,
  'day_id': number,
  'entry_id': number,
  'new_time': number,
};
const saveEntryActionType = "SAVE_ENTRY";
const concurrentModificationResetActionType = "CONCURRENT_MODIFICATION_RESET";
async function saveEntry(
  fetchJSON: FetchJSON,
  serverID: ?string,
  newText: string,
  prevText: string,
  sessionID: string,
  year: number,
  month: number,
  day: number,
  calendarID: string,
  creationTime: number,
): Promise<SaveResult> {
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
  fetchJSON: FetchJSON,
  serverID: string,
  prevText: string,
  sessionID: string,
): Promise<void> {
  await fetchJSON('delete_entry.php', {
    'id': serverID,
    'prev_text': prevText,
    'session_id': sessionID,
    'timestamp': Date.now(),
  });
}

const fetchRevisionsForEntryActionType = "FETCH_REVISIONS_FOR_ENTRY";
async function fetchRevisionsForEntry(
  fetchJSON: FetchJSON,
  entryID: string,
): Promise<HistoryRevisionInfo[]> {
  const response = await fetchJSON('entry_history.php', { 'id': entryID });
  return response.result;
}

const restoreEntryActionType = "RESTORE_ENTRY";
async function restoreEntry(
  fetchJSON: FetchJSON,
  entryID: string,
  sessionID: string,
): Promise<void> {
  await fetchJSON('restore_entry.php', {
    'id': entryID,
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
  fetchRevisionsForEntryActionType,
  fetchRevisionsForEntry,
  restoreEntryActionType,
  restoreEntry,
};
