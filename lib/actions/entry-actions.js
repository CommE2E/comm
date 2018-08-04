// @flow

import type {
  RawEntryInfo,
  CalendarQuery,
  SaveEntryInfo,
  SaveEntryResponse,
  CreateEntryInfo,
  SaveEntryPayload,
  DeleteEntryInfo,
  DeleteEntryResponse,
  RestoreEntryInfo,
  RestoreEntryResponse,
  FetchEntryInfosResult,
  CalendarResult,
} from '../types/entry-types';
import type { FetchJSON } from '../utils/fetch-json';
import type { HistoryRevisionInfo } from '../types/history-types';
import type { UserInfo } from '../types/user-types';
import type { RawMessageInfo } from '../types/message-types';

import { dateFromString } from '../utils/date-utils'
import { getNewLocalID } from '../utils/local-ids';

const fetchEntriesActionTypes = Object.freeze({
  started: "FETCH_ENTRIES_STARTED",
  success: "FETCH_ENTRIES_SUCCESS",
  failed: "FETCH_ENTRIES_FAILED",
});
async function fetchEntries(
  fetchJSON: FetchJSON,
  calendarQuery: CalendarQuery,
): Promise<FetchEntryInfosResult> {
  const response = await fetchJSON('fetch_entries', calendarQuery);
  const userInfos: any = Object.values(response.userInfos);
  return {
    rawEntryInfos: response.rawEntryInfos,
    userInfos,
  };
}

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
    rawEntryInfos: fetchEntriesResult.rawEntryInfos,
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
  request: CreateEntryInfo,
): Promise<SaveEntryPayload> {
  const result = await fetchJSON('create_entry', request);
  return {
    entryID: result.entryID,
    text: request.text,
    newMessageInfos: result.newMessageInfos,
    threadID: request.threadID,
    updatesResult: result.updatesResult,
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
  request: SaveEntryInfo,
): Promise<SaveEntryResponse> {
  const result = await fetchJSON('update_entry', request);
  return {
    entryID: result.entryID,
    text: request.text,
    newMessageInfos: result.newMessageInfos,
    updatesResult: result.updatesResult,
  };
}

const deleteEntryActionTypes = Object.freeze({
  started: "DELETE_ENTRY_STARTED",
  success: "DELETE_ENTRY_SUCCESS",
  failed: "DELETE_ENTRY_FAILED",
});
async function deleteEntry(
  fetchJSON: FetchJSON,
  info: DeleteEntryInfo,
): Promise<DeleteEntryResponse> {
  const response = await fetchJSON('delete_entry', {
    ...info,
    timestamp: Date.now(),
  });
  return {
    newMessageInfos: response.newMessageInfos,
    threadID: response.threadID,
    updatesResult: response.updatesResult,
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
): Promise<$ReadOnlyArray<HistoryRevisionInfo>> {
  const response = await fetchJSON('fetch_entry_revisions', { id: entryID });
  return response.result;
}

const restoreEntryActionTypes = Object.freeze({
  started: "RESTORE_ENTRY_STARTED",
  success: "RESTORE_ENTRY_SUCCESS",
  failed: "RESTORE_ENTRY_FAILED",
});
async function restoreEntry(
  fetchJSON: FetchJSON,
  info: RestoreEntryInfo,
): Promise<RestoreEntryResponse> {
  const response = await fetchJSON('restore_entry', {
    ...info,
    timestamp: Date.now(),
  });
  return {
    newMessageInfos: response.newMessageInfos,
    entryInfo: response.entryInfo,
    updatesResult: response.updatesResult,
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
