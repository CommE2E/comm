// @flow

import type {
  RawEntryInfo,
  CalendarQuery,
  SaveEntryInfo,
  SaveEntryResponse,
  CreateEntryInfo,
  CreateEntryPayload,
  DeleteEntryInfo,
  DeleteEntryResponse,
  RestoreEntryInfo,
  RestoreEntryResponse,
  FetchEntryInfosResult,
  CalendarQueryUpdateResult,
} from '../types/entry-types';
import type { FetchJSON } from '../utils/fetch-json';
import type { HistoryRevisionInfo } from '../types/history-types';

import { dateFromString } from '../utils/date-utils';

const fetchEntriesActionTypes = Object.freeze({
  started: 'FETCH_ENTRIES_STARTED',
  success: 'FETCH_ENTRIES_SUCCESS',
  failed: 'FETCH_ENTRIES_FAILED',
});
async function fetchEntries(
  fetchJSON: FetchJSON,
  calendarQuery: CalendarQuery,
): Promise<FetchEntryInfosResult> {
  const response = await fetchJSON('fetch_entries', calendarQuery);
  return {
    rawEntryInfos: response.rawEntryInfos,
  };
}

const updateCalendarQueryActionTypes = Object.freeze({
  started: 'UPDATE_CALENDAR_QUERY_STARTED',
  success: 'UPDATE_CALENDAR_QUERY_SUCCESS',
  failed: 'UPDATE_CALENDAR_QUERY_FAILED',
});
async function updateCalendarQuery(
  fetchJSON: FetchJSON,
  calendarQuery: CalendarQuery,
  reduxAlreadyUpdated: boolean = false,
): Promise<CalendarQueryUpdateResult> {
  const response = await fetchJSON('update_calendar_query', calendarQuery);
  const { rawEntryInfos, deletedEntryIDs } = response;
  return {
    rawEntryInfos,
    deletedEntryIDs,
    calendarQuery,
    calendarQueryAlreadyUpdated: reduxAlreadyUpdated,
  };
}

const createLocalEntryActionType = 'CREATE_LOCAL_ENTRY';
function createLocalEntry(
  threadID: string,
  localID: number,
  dateString: string,
  creatorID: string,
): RawEntryInfo {
  const date = dateFromString(dateString);
  const newEntryInfo: RawEntryInfo = {
    localID: `local${localID}`,
    threadID,
    text: '',
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
  started: 'CREATE_ENTRY_STARTED',
  success: 'CREATE_ENTRY_SUCCESS',
  failed: 'CREATE_ENTRY_FAILED',
});
async function createEntry(
  fetchJSON: FetchJSON,
  request: CreateEntryInfo,
): Promise<CreateEntryPayload> {
  const result = await fetchJSON('create_entry', request);
  return {
    entryID: result.entryID,
    newMessageInfos: result.newMessageInfos,
    threadID: request.threadID,
    localID: request.localID,
    updatesResult: result.updatesResult,
  };
}

const saveEntryActionTypes = Object.freeze({
  started: 'SAVE_ENTRY_STARTED',
  success: 'SAVE_ENTRY_SUCCESS',
  failed: 'SAVE_ENTRY_FAILED',
});
const concurrentModificationResetActionType = 'CONCURRENT_MODIFICATION_RESET';
async function saveEntry(
  fetchJSON: FetchJSON,
  request: SaveEntryInfo,
): Promise<SaveEntryResponse> {
  const result = await fetchJSON('update_entry', request);
  return {
    entryID: result.entryID,
    newMessageInfos: result.newMessageInfos,
    updatesResult: result.updatesResult,
  };
}

const deleteEntryActionTypes = Object.freeze({
  started: 'DELETE_ENTRY_STARTED',
  success: 'DELETE_ENTRY_SUCCESS',
  failed: 'DELETE_ENTRY_FAILED',
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
  started: 'FETCH_REVISIONS_FOR_ENTRY_STARTED',
  success: 'FETCH_REVISIONS_FOR_ENTRY_SUCCESS',
  failed: 'FETCH_REVISIONS_FOR_ENTRY_FAILED',
});
async function fetchRevisionsForEntry(
  fetchJSON: FetchJSON,
  entryID: string,
): Promise<$ReadOnlyArray<HistoryRevisionInfo>> {
  const response = await fetchJSON('fetch_entry_revisions', { id: entryID });
  return response.result;
}

const restoreEntryActionTypes = Object.freeze({
  started: 'RESTORE_ENTRY_STARTED',
  success: 'RESTORE_ENTRY_SUCCESS',
  failed: 'RESTORE_ENTRY_FAILED',
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
    updatesResult: response.updatesResult,
  };
}

export {
  fetchEntriesActionTypes,
  fetchEntries,
  updateCalendarQueryActionTypes,
  updateCalendarQuery,
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
