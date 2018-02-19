// @flow

import type { BaseAppState } from '../types/redux-types';
import type {
  RawEntryInfo,
  CalendarQuery,
  SaveEntryRequest,
  SaveEntryResponse,
  CreateEntryRequest,
  SaveEntryPayload,
  DeleteEntryResponse,
  RestoreEntryResponse,
} from '../types/entry-types';
import type { FetchJSON } from '../utils/fetch-json';
import type { HistoryRevisionInfo } from '../types/history-types';
import type { UserInfo } from '../types/user-types';
import type { RawMessageInfo } from '../types/message-types';

import { dateFromString } from '../utils/date-utils'
import { getNewLocalID } from '../utils/local-ids';

export type FetchEntriesResult = {|
  entryInfos: $ReadOnlyArray<RawEntryInfo>,
  userInfos: UserInfo[],
|};
const fetchEntriesActionTypes = Object.freeze({
  started: "FETCH_ENTRIES_STARTED",
  success: "FETCH_ENTRIES_SUCCESS",
  failed: "FETCH_ENTRIES_FAILED",
});
async function fetchEntries(
  fetchJSON: FetchJSON,
  calendarQuery: CalendarQuery,
): Promise<FetchEntriesResult> {
  const response = await fetchJSON('fetch_entries.php', {
    input: calendarQuery,
  });
  return {
    entryInfos: response.rawEntryInfos,
    userInfos: response.userInfos,
  };
}

export type CalendarResult = {|
  entryInfos: $ReadOnlyArray<RawEntryInfo>,
  calendarQuery: CalendarQuery,
  userInfos: UserInfo[],
|};
const fetchEntriesAndSetRangeActionTypes = Object.freeze({
  started: "FETCH_ENTRIES_AND_SET_RANGE_STARTED",
  success: "FETCH_ENTRIES_AND_SET_RANGE_SUCCESS",
  failed: "FETCH_ENTRIES_AND_SET_RANGE_FAILED",
});
const fetchEntriesAndAppendRangeActionTypes = Object.freeze({
  started: "FETCH_ENTRIES_AND_APPEND_RANGE_STARTED",
  success: "FETCH_ENTRIES_AND_APPEND_RANGE_SUCCESS",
  failed: "FETCH_ENTRIES_AND_APPEND_RANGE_FAILED",
});
async function fetchEntriesWithRange(
  fetchJSON: FetchJSON,
  calendarQuery: CalendarQuery,
): Promise<CalendarResult> {
  const fetchEntriesResult = await fetchEntries(fetchJSON, calendarQuery);
  return {
    entryInfos: fetchEntriesResult.entryInfos,
    calendarQuery,
    userInfos: fetchEntriesResult.userInfos,
  };
}

const createLocalEntryActionType = "CREATE_LOCAL_ENTRY";
function createLocalEntry(
  threadID: string,
  dateString: string,
  creatorID: string,
): RawEntryInfo {
  const date = dateFromString(dateString);
  const newEntryInfo: RawEntryInfo = {
    localID: `local${getNewLocalID()}`,
    threadID,
    text: "",
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    creationTime: Date.now(),
    creatorID,
    deleted: false,
  };
  return newEntryInfo;
}

const createEntryActionTypes = Object.freeze({
  started: "CREATE_ENTRY_STARTED",
  success: "CREATE_ENTRY_SUCCESS",
  failed: "CREATE_ENTRY_FAILED",
});
async function createEntry(
  fetchJSON: FetchJSON,
  request: CreateEntryRequest,
): Promise<SaveEntryPayload> {
  const result = await fetchJSON('create_entry.php', { input: request });
  return {
    entryID: result.entryID,
    text: request.text,
    newMessageInfos: result.newMessageInfos,
    threadID: request.threadID,
  };
}
  
const saveEntryActionTypes = Object.freeze({
  started: "SAVE_ENTRY_STARTED",
  success: "SAVE_ENTRY_SUCCESS",
  failed: "SAVE_ENTRY_FAILED",
});
const concurrentModificationResetActionType = "CONCURRENT_MODIFICATION_RESET";
async function saveEntry(
  fetchJSON: FetchJSON,
  request: SaveEntryRequest,
): Promise<SaveEntryResponse> {
  const result = await fetchJSON('save.php', { input: request });
  return {
    entryID: result.entryID,
    text: request.text,
    newMessageInfos: result.newMessageInfos,
  };
}

const deleteEntryActionTypes = Object.freeze({
  started: "DELETE_ENTRY_STARTED",
  success: "DELETE_ENTRY_SUCCESS",
  failed: "DELETE_ENTRY_FAILED",
});
async function deleteEntry(
  fetchJSON: FetchJSON,
  entryID: string,
  prevText: string,
  sessionID: string,
): Promise<DeleteEntryResponse> {
  const response = await fetchJSON('delete_entry.php', { input: {
    entryID,
    prevText,
    sessionID,
    timestamp: Date.now(),
  }});
  return {
    newMessageInfos: response.newMessageInfos,
    threadID: response.threadID,
  };
}

const fetchRevisionsForEntryActionTypes = Object.freeze({
  started: "FETCH_REVISIONS_FOR_ENTRY_STARTED",
  success: "FETCH_REVISIONS_FOR_ENTRY_SUCCESS",
  failed: "FETCH_REVISIONS_FOR_ENTRY_FAILED",
});
async function fetchRevisionsForEntry(
  fetchJSON: FetchJSON,
  entryID: string,
): Promise<HistoryRevisionInfo[]> {
  const response = await fetchJSON('entry_history.php', {
    input: { id: entryID },
  });
  return response.result;
}

const restoreEntryActionTypes = Object.freeze({
  started: "RESTORE_ENTRY_STARTED",
  success: "RESTORE_ENTRY_SUCCESS",
  failed: "RESTORE_ENTRY_FAILED",
});
async function restoreEntry(
  fetchJSON: FetchJSON,
  entryID: string,
  sessionID: string,
): Promise<RestoreEntryResponse> {
  const response = await fetchJSON('restore_entry.php', { input: {
    entryID,
    sessionID,
    timestamp: Date.now(),
  }});
  return {
    newMessageInfos: response.newMessageInfos,
    entryInfo: response.entryInfo,
  };
}

export {
  fetchEntriesActionTypes,
  fetchEntries,
  fetchEntriesAndSetRangeActionTypes,
  fetchEntriesAndAppendRangeActionTypes,
  fetchEntriesWithRange,
  createLocalEntryActionType,
  createLocalEntry,
  createEntryActionTypes,
  createEntry,
  saveEntryActionTypes,
  concurrentModificationResetActionType,
  saveEntry,
  deleteEntryActionTypes,
  deleteEntry,
  fetchRevisionsForEntryActionTypes,
  fetchRevisionsForEntry,
  restoreEntryActionTypes,
  restoreEntry,
};
