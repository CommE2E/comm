// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { filteredThreadIDs } from 'lib/selectors/calendar-filter-selectors';
import type { CalendarQuery } from 'lib/types/entry-types';
import type {
  SaveEntryRequest,
  CreateEntryRequest,
  DeleteEntryRequest,
  DeleteEntryResponse,
  RestoreEntryRequest,
  RestoreEntryResponse,
  FetchEntryInfosResponse,
  DeltaEntryInfosResult,
  SaveEntryResponse,
} from 'lib/types/entry-types-api';
import { calendarThreadFilterTypes } from 'lib/types/filter-types';
import type {
  FetchEntryRevisionInfosResult,
  FetchEntryRevisionInfosRequest,
} from 'lib/types/history-types';
import { ServerError } from 'lib/utils/errors';
import { tString, tShape, tDate } from 'lib/utils/validation-utils';

import createEntry from '../creators/entry-creator';
import { deleteEntry, restoreEntry } from '../deleters/entry-deleters';
import {
  fetchEntryInfos,
  fetchEntryRevisionInfo,
  fetchEntriesForSession,
} from '../fetchers/entry-fetchers';
import { verifyThreadIDs } from '../fetchers/thread-fetchers';
import type { Viewer } from '../session/viewer';
import {
  updateEntry,
  compareNewCalendarQuery,
} from '../updaters/entry-updaters';
import { commitSessionUpdate } from '../updaters/session-updaters';
import { validateInput } from '../utils/validation-utils';

const entryQueryInputValidator: TInterface = tShape({
  navID: t.maybe(t.String),
  startDate: tDate,
  endDate: tDate,
  includeDeleted: t.maybe(t.Boolean),
  filters: t.maybe(
    t.list(
      t.union([
        tShape({
          type: tString(calendarThreadFilterTypes.NOT_DELETED),
        }),
        tShape({
          type: tString(calendarThreadFilterTypes.THREAD_LIST),
          threadIDs: t.list(t.String),
        }),
      ]),
    ),
  ),
});
const newEntryQueryInputValidator: TInterface = tShape({
  startDate: tDate,
  endDate: tDate,
  filters: t.list(
    t.union([
      tShape({
        type: tString(calendarThreadFilterTypes.NOT_DELETED),
      }),
      tShape({
        type: tString(calendarThreadFilterTypes.THREAD_LIST),
        threadIDs: t.list(t.String),
      }),
    ]),
  ),
});

function normalizeCalendarQuery(input: any): CalendarQuery {
  if (input.filters) {
    return {
      startDate: input.startDate,
      endDate: input.endDate,
      filters: input.filters,
    };
  }
  const filters = [];
  if (!input.includeDeleted) {
    filters.push({ type: calendarThreadFilterTypes.NOT_DELETED });
  }
  if (input.navID !== 'home') {
    filters.push({
      type: calendarThreadFilterTypes.THREAD_LIST,
      threadIDs: [input.navID],
    });
  }
  return {
    startDate: input.startDate,
    endDate: input.endDate,
    filters,
  };
}

async function verifyCalendarQueryThreadIDs(
  request: CalendarQuery,
): Promise<void> {
  const threadIDsToFilterTo = filteredThreadIDs(request.filters);
  if (threadIDsToFilterTo && threadIDsToFilterTo.size > 0) {
    const verifiedThreadIDs = await verifyThreadIDs([...threadIDsToFilterTo]);
    if (verifiedThreadIDs.length !== threadIDsToFilterTo.size) {
      throw new ServerError('invalid_parameters');
    }
  }
}

async function entryFetchResponder(
  viewer: Viewer,
  input: any,
): Promise<FetchEntryInfosResponse> {
  await validateInput(viewer, entryQueryInputValidator, input);
  const request = normalizeCalendarQuery(input);

  await verifyCalendarQueryThreadIDs(request);

  const response = await fetchEntryInfos(viewer, [request]);
  return { ...response, userInfos: {} };
}

const entryRevisionHistoryFetchInputValidator = tShape({
  id: t.String,
});

async function entryRevisionFetchResponder(
  viewer: Viewer,
  input: any,
): Promise<FetchEntryRevisionInfosResult> {
  const request: FetchEntryRevisionInfosRequest = input;
  await validateInput(viewer, entryRevisionHistoryFetchInputValidator, request);
  const entryHistory = await fetchEntryRevisionInfo(viewer, request.id);
  return { result: entryHistory };
}

const createEntryRequestInputValidator = tShape({
  text: t.String,
  sessionID: t.maybe(t.String),
  timestamp: t.Number,
  date: tDate,
  threadID: t.String,
  localID: t.maybe(t.String),
  calendarQuery: t.maybe(newEntryQueryInputValidator),
});

async function entryCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<SaveEntryResponse> {
  const request: CreateEntryRequest = input;
  await validateInput(viewer, createEntryRequestInputValidator, request);
  return await createEntry(viewer, request);
}

const saveEntryRequestInputValidator = tShape({
  entryID: t.String,
  text: t.String,
  prevText: t.String,
  sessionID: t.maybe(t.String),
  timestamp: t.Number,
  calendarQuery: t.maybe(newEntryQueryInputValidator),
});

async function entryUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<SaveEntryResponse> {
  const request: SaveEntryRequest = input;
  await validateInput(viewer, saveEntryRequestInputValidator, request);
  return await updateEntry(viewer, request);
}

const deleteEntryRequestInputValidator = tShape({
  entryID: t.String,
  prevText: t.String,
  sessionID: t.maybe(t.String),
  timestamp: t.Number,
  calendarQuery: t.maybe(newEntryQueryInputValidator),
});

async function entryDeletionResponder(
  viewer: Viewer,
  input: any,
): Promise<DeleteEntryResponse> {
  const request: DeleteEntryRequest = input;
  await validateInput(viewer, deleteEntryRequestInputValidator, request);
  return await deleteEntry(viewer, request);
}

const restoreEntryRequestInputValidator = tShape({
  entryID: t.String,
  sessionID: t.maybe(t.String),
  timestamp: t.Number,
  calendarQuery: t.maybe(newEntryQueryInputValidator),
});

async function entryRestorationResponder(
  viewer: Viewer,
  input: any,
): Promise<RestoreEntryResponse> {
  const request: RestoreEntryRequest = input;
  await validateInput(viewer, restoreEntryRequestInputValidator, request);
  return await restoreEntry(viewer, request);
}

async function calendarQueryUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<DeltaEntryInfosResult> {
  const request: CalendarQuery = input;
  await validateInput(viewer, newEntryQueryInputValidator, input);

  await verifyCalendarQueryThreadIDs(request);
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const {
    difference,
    oldCalendarQuery,
    sessionUpdate,
  } = compareNewCalendarQuery(viewer, request);

  const [response] = await Promise.all([
    fetchEntriesForSession(viewer, difference, oldCalendarQuery),
    commitSessionUpdate(viewer, sessionUpdate),
  ]);

  return {
    rawEntryInfos: response.rawEntryInfos,
    deletedEntryIDs: response.deletedEntryIDs,
    // Old clients expect userInfos object
    userInfos: [],
  };
}

export {
  entryQueryInputValidator,
  newEntryQueryInputValidator,
  normalizeCalendarQuery,
  verifyCalendarQueryThreadIDs,
  entryFetchResponder,
  entryRevisionFetchResponder,
  entryCreationResponder,
  entryUpdateResponder,
  entryDeletionResponder,
  entryRestorationResponder,
  calendarQueryUpdateResponder,
};
