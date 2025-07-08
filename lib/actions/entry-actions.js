// @flow

import * as React from 'react';

import {
  extractKeyserverIDFromID,
  sortCalendarQueryPerKeyserver,
} from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { getNextLocalID } from '../shared/id-utils.js';
import { threadSpecs } from '../shared/threads/thread-specs.js';
import type {
  RawEntryInfo,
  CalendarQuery,
  SaveEntryInfo,
  SaveEntryResult,
  CreateEntryInfo,
  CreateEntryPayload,
  DeleteEntryInfo,
  DeleteEntryResult,
  RestoreEntryInfo,
  RestoreEntryResult,
  FetchEntryInfosResult,
  CalendarQueryUpdateResult,
} from '../types/entry-types.js';
import type { HistoryRevisionInfo } from '../types/history-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types';
import { dateFromString } from '../utils/date-utils.js';
import { useSelector } from '../utils/redux-utils.js';

const fetchEntriesActionTypes = Object.freeze({
  started: 'FETCH_ENTRIES_STARTED',
  success: 'FETCH_ENTRIES_SUCCESS',
  failed: 'FETCH_ENTRIES_FAILED',
});
const fetchEntries =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((calendarQuery: CalendarQuery) => Promise<FetchEntryInfosResult>) =>
  async calendarQuery => {
    const calendarQueries = sortCalendarQueryPerKeyserver(
      calendarQuery,
      allKeyserverIDs,
    );
    const requests: { [string]: CalendarQuery } = {};
    for (const keyserverID of allKeyserverIDs) {
      requests[keyserverID] = calendarQueries[keyserverID];
    }

    const responses = await callKeyserverEndpoint('fetch_entries', requests);
    let rawEntryInfos: $ReadOnlyArray<RawEntryInfo> = [];
    for (const keyserverID in responses) {
      rawEntryInfos = rawEntryInfos.concat(
        responses[keyserverID].rawEntryInfos,
      );
    }
    return {
      rawEntryInfos,
    };
  };

function useFetchEntries(): (
  calendarQuery: CalendarQuery,
) => Promise<FetchEntryInfosResult> {
  return useKeyserverCall(fetchEntries);
}

export type UpdateCalendarQueryInput = {
  +calendarQuery: CalendarQuery,
  +reduxAlreadyUpdated?: boolean,
  +keyserverIDs?: $ReadOnlyArray<string>,
};

const updateCalendarQueryActionTypes = Object.freeze({
  started: 'UPDATE_CALENDAR_QUERY_STARTED',
  success: 'UPDATE_CALENDAR_QUERY_SUCCESS',
  failed: 'UPDATE_CALENDAR_QUERY_FAILED',
});
const updateCalendarQuery =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((
    input: UpdateCalendarQueryInput,
  ) => Promise<CalendarQueryUpdateResult>) =>
  async input => {
    const { calendarQuery, reduxAlreadyUpdated = false } = input;

    const keyserverIDs = input.keyserverIDs ?? allKeyserverIDs;

    const calendarQueries = sortCalendarQueryPerKeyserver(
      calendarQuery,
      keyserverIDs,
    );

    const requests: { [string]: CalendarQuery } = {};
    for (const keyserverID of keyserverIDs) {
      requests[keyserverID] = calendarQueries[keyserverID];
    }

    const responses = await callKeyserverEndpoint(
      'update_calendar_query',
      requests,
    );
    let rawEntryInfos: $ReadOnlyArray<RawEntryInfo> = [];
    let deletedEntryIDs: $ReadOnlyArray<string> = [];
    for (const keyserverID in responses) {
      rawEntryInfos = rawEntryInfos.concat(
        responses[keyserverID].rawEntryInfos,
      );
      deletedEntryIDs = deletedEntryIDs.concat(
        responses[keyserverID].deletedEntryIDs,
      );
    }
    return {
      rawEntryInfos,
      deletedEntryIDs,
      calendarQuery,
      calendarQueryAlreadyUpdated: reduxAlreadyUpdated,
      keyserverIDs,
    };
  };

function useUpdateCalendarQuery(): (
  input: UpdateCalendarQueryInput,
) => Promise<CalendarQueryUpdateResult> {
  return useKeyserverCall(updateCalendarQuery);
}

const createLocalEntryActionType = 'CREATE_LOCAL_ENTRY';
function createLocalEntry(
  threadID: string,
  dateString: string,
  creatorID: string,
): RawEntryInfo {
  const date = dateFromString(dateString);
  const localID = getNextLocalID();
  const newEntryInfo: RawEntryInfo = {
    localID,
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
const createEntry =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: CreateEntryInfo) => Promise<CreateEntryPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const calendarQueries = sortCalendarQueryPerKeyserver(input.calendarQuery, [
      keyserverID,
    ]);

    const requests = {
      [keyserverID]: {
        ...input,
        calendarQuery: calendarQueries[keyserverID],
      },
    };

    const response = await callKeyserverEndpoint('create_entry', requests);
    return {
      entryID: response[keyserverID].entryID,
      newMessageInfos: response[keyserverID].newMessageInfos,
      threadID: input.threadID,
      localID: input.localID,
      updatesResult: response[keyserverID].updatesResult,
    };
  };

export type UseCreateEntryInput = {
  +threadInfo: ThreadInfo,
  +createEntryInfo: CreateEntryInfo,
};
function useCreateEntry(): (
  input: UseCreateEntryInput,
) => Promise<CreateEntryPayload> {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const keyserverCall = useKeyserverCall(createEntry);

  return React.useCallback(
    (input: UseCreateEntryInput) =>
      threadSpecs[input.threadInfo.type]
        .protocol()
        .createCalendarEntry(
          { input, viewerID },
          { processAndSendDMOperation, keyserverCreateEntry: keyserverCall },
        ),
    [keyserverCall, processAndSendDMOperation, viewerID],
  );
}

const saveEntryActionTypes = Object.freeze({
  started: 'SAVE_ENTRY_STARTED',
  success: 'SAVE_ENTRY_SUCCESS',
  failed: 'SAVE_ENTRY_FAILED',
});
const concurrentModificationResetActionType = 'CONCURRENT_MODIFICATION_RESET';
const saveEntry =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: SaveEntryInfo) => Promise<SaveEntryResult>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.entryID);
    const calendarQueries = sortCalendarQueryPerKeyserver(input.calendarQuery, [
      keyserverID,
    ]);

    const requests = {
      [keyserverID]: {
        ...input,
        calendarQuery: calendarQueries[keyserverID],
      },
    };

    const response = await callKeyserverEndpoint('update_entry', requests);
    return {
      entryID: response[keyserverID].entryID,
      newMessageInfos: response[keyserverID].newMessageInfos,
      updatesResult: response[keyserverID].updatesResult,
    };
  };

export type UseSaveEntryInput = {
  +threadInfo: ThreadInfo,
  +saveEntryInfo: SaveEntryInfo,
};
function useSaveEntry(): (
  input: UseSaveEntryInput,
) => Promise<SaveEntryResult> {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const keyserverCall = useKeyserverCall(saveEntry);
  const entryInfos = useSelector(state => state.entryStore.entryInfos);

  return React.useCallback(
    (input: UseSaveEntryInput) =>
      threadSpecs[input.threadInfo.type].protocol().editCalendarEntry(
        {
          input,
          viewerID,
          originalEntry: entryInfos[input.saveEntryInfo.entryID],
        },
        { processAndSendDMOperation, keyserverEditEntry: keyserverCall },
      ),
    [keyserverCall, processAndSendDMOperation, viewerID, entryInfos],
  );
}

const deleteEntryActionTypes = Object.freeze({
  started: 'DELETE_ENTRY_STARTED',
  success: 'DELETE_ENTRY_SUCCESS',
  failed: 'DELETE_ENTRY_FAILED',
});
const deleteEntry =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((info: DeleteEntryInfo) => Promise<DeleteEntryResult>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.entryID);
    const calendarQueries = sortCalendarQueryPerKeyserver(input.calendarQuery, [
      keyserverID,
    ]);

    const requests = {
      [keyserverID]: {
        ...input,
        calendarQuery: calendarQueries[keyserverID],
        timestamp: Date.now(),
      },
    };

    const response = await callKeyserverEndpoint('delete_entry', requests);
    return {
      newMessageInfos: response[keyserverID].newMessageInfos,
      threadID: response[keyserverID].threadID,
      updatesResult: response[keyserverID].updatesResult,
    };
  };

export type UseDeleteEntryInput = {
  +threadInfo: ThreadInfo,
  +deleteEntryInfo: DeleteEntryInfo,
};
function useDeleteEntry(): (
  input: UseDeleteEntryInput,
) => Promise<DeleteEntryResult> {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const keyserverCall = useKeyserverCall(deleteEntry);
  const entryInfos = useSelector(state => state.entryStore.entryInfos);

  return React.useCallback(
    (input: UseDeleteEntryInput) =>
      threadSpecs[input.threadInfo.type].protocol().deleteCalendarEntry(
        {
          input,
          viewerID,
          originalEntry: entryInfos[input.deleteEntryInfo.entryID],
        },
        { processAndSendDMOperation, keyserverDeleteEntry: keyserverCall },
      ),
    [keyserverCall, processAndSendDMOperation, viewerID, entryInfos],
  );
}

export type FetchRevisionsForEntryInput = {
  +entryID: string,
};
const fetchRevisionsForEntryActionTypes = Object.freeze({
  started: 'FETCH_REVISIONS_FOR_ENTRY_STARTED',
  success: 'FETCH_REVISIONS_FOR_ENTRY_SUCCESS',
  failed: 'FETCH_REVISIONS_FOR_ENTRY_FAILED',
});
const fetchRevisionsForEntry =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: FetchRevisionsForEntryInput,
  ) => Promise<$ReadOnlyArray<HistoryRevisionInfo>>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.entryID);
    const requests = {
      [keyserverID]: {
        id: input.entryID,
      },
    };

    const response = await callKeyserverEndpoint(
      'fetch_entry_revisions',
      requests,
    );
    return response[keyserverID].result;
  };

function useFetchRevisionsForEntry(): (
  input: FetchRevisionsForEntryInput,
) => Promise<$ReadOnlyArray<HistoryRevisionInfo>> {
  return useKeyserverCall(fetchRevisionsForEntry);
}

const restoreEntryActionTypes = Object.freeze({
  started: 'RESTORE_ENTRY_STARTED',
  success: 'RESTORE_ENTRY_SUCCESS',
  failed: 'RESTORE_ENTRY_FAILED',
});
const restoreEntry =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: RestoreEntryInfo) => Promise<RestoreEntryResult>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.entryID);
    const calendarQueries = sortCalendarQueryPerKeyserver(input.calendarQuery, [
      keyserverID,
    ]);

    const requests = {
      [keyserverID]: {
        ...input,
        calendarQuery: calendarQueries[keyserverID],
        timestamp: Date.now(),
      },
    };

    const response = await callKeyserverEndpoint('restore_entry', requests);
    return {
      newMessageInfos: response[keyserverID].newMessageInfos,
      updatesResult: response[keyserverID].updatesResult,
    };
  };

function useRestoreEntry(): (
  input: RestoreEntryInfo,
) => Promise<RestoreEntryResult> {
  return useKeyserverCall(restoreEntry);
}

export {
  fetchEntriesActionTypes,
  useFetchEntries,
  updateCalendarQueryActionTypes,
  useUpdateCalendarQuery,
  createLocalEntryActionType,
  createLocalEntry,
  createEntryActionTypes,
  useCreateEntry,
  saveEntryActionTypes,
  concurrentModificationResetActionType,
  useSaveEntry,
  deleteEntryActionTypes,
  useDeleteEntry,
  fetchRevisionsForEntryActionTypes,
  useFetchRevisionsForEntry,
  restoreEntryActionTypes,
  useRestoreEntry,
};
