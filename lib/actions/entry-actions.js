// @flow

import type { BaseAppState } from '../types/redux-types';
import type { EntryInfo } from '../types/entry-types';
import type { FetchJSON } from '../utils/fetch-json';
import type { HistoryRevisionInfo } from '../types/history-types';
import type { CalendarQuery } from '../selectors/nav-selectors';

import { dateFromString } from '../utils/date-utils'

const fetchEntriesActionType = "FETCH_ENTRIES";
async function fetchEntries(
  fetchJSON: FetchJSON,
  calendarQuery: CalendarQuery,
): Promise<EntryInfo[]> {
  const response = await fetchJSON('fetch_entries.php', {
    'nav': calendarQuery.navID,
    'start_date': calendarQuery.startDate,
    'end_date': calendarQuery.endDate,
    'include_deleted': !!calendarQuery.includeDeleted,
  });
  return response.result;
}

export type CalendarResult = {
  entryInfos: EntryInfo[],
  calendarQuery: CalendarQuery,
};
const fetchEntriesAndSetRangeActionType = "FETCH_ENTRIES_AND_SET_RANGE";
const fetchEntriesAndAppendRangeActionType = "FETCH_ENTRIES_AND_APPEND_RANGE";
async function fetchEntriesWithRange(
  fetchJSON: FetchJSON,
  calendarQuery: CalendarQuery,
): Promise<CalendarResult> {
  const entryInfos = await fetchEntries(fetchJSON, calendarQuery);
  return { entryInfos, calendarQuery };
}

const createLocalEntryActionType = "CREATE_LOCAL_ENTRY";
let curLocalID = 0;
function createLocalEntry(
  threadID: string,
  dateString: string,
  creator: ?string,
): EntryInfo {
  const date = dateFromString(dateString);
  const newEntryInfo: EntryInfo = {
    localID: `local${curLocalID++}`,
    threadID,
    text: "",
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    creationTime: Date.now(),
    creator,
    deleted: false,
  };
  return newEntryInfo;
}

function setCurLocalID(localID: number) {
  curLocalID = localID;
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
  threadID: string,
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
    payload['thread'] = threadID;
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
  fetchEntriesActionType,
  fetchEntries,
  fetchEntriesAndSetRangeActionType,
  fetchEntriesAndAppendRangeActionType,
  fetchEntriesWithRange,
  createLocalEntryActionType,
  createLocalEntry,
  setCurLocalID,
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
