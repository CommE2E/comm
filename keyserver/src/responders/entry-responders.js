// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { filteredThreadIDs } from 'lib/selectors/calendar-filter-selectors.js';
import {
  type CalendarQuery,
  type SaveEntryRequest,
  type CreateEntryRequest,
  type DeleteEntryRequest,
  type DeleteEntryResponse,
  type RestoreEntryRequest,
  type RestoreEntryResponse,
  type FetchEntryInfosResponse,
  type DeltaEntryInfosResult,
  type SaveEntryResponse,
  calendarQueryValidator,
} from 'lib/types/entry-types.js';
import {
  type CalendarFilter,
  calendarThreadFilterTypes,
  calendarFilterValidator,
} from 'lib/types/filter-types.js';
import {
  type FetchEntryRevisionInfosResult,
  type FetchEntryRevisionInfosRequest,
} from 'lib/types/history-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { tShape, tDate, tID } from 'lib/utils/validation-utils.js';

import createEntry from '../creators/entry-creator.js';
import { deleteEntry, restoreEntry } from '../deleters/entry-deleters.js';
import {
  fetchEntryInfos,
  fetchEntryRevisionInfo,
  fetchEntriesForSession,
} from '../fetchers/entry-fetchers.js';
import { verifyThreadIDs } from '../fetchers/thread-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import {
  updateEntry,
  compareNewCalendarQuery,
} from '../updaters/entry-updaters.js';
import { commitSessionUpdate } from '../updaters/session-updaters.js';

type EntryQueryInput = {
  +startDate: string,
  +endDate: string,
  +navID?: ?string,
  +includeDeleted?: ?boolean,
  +filters?: ?$ReadOnlyArray<CalendarFilter>,
};
const entryQueryInputValidator: TInterface<EntryQueryInput> =
  tShape<EntryQueryInput>({
    navID: t.maybe(t.String),
    startDate: tDate,
    endDate: tDate,
    includeDeleted: t.maybe(t.Boolean),
    filters: t.maybe(t.list(calendarFilterValidator)),
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
  inputQuery: EntryQueryInput,
): Promise<FetchEntryInfosResponse> {
  const request = normalizeCalendarQuery(inputQuery);

  await verifyCalendarQueryThreadIDs(request);

  const response = await fetchEntryInfos(viewer, [request]);
  return {
    ...response,
    userInfos: {},
  };
}

export const entryRevisionHistoryFetchInputValidator: TInterface<FetchEntryRevisionInfosRequest> =
  tShape<FetchEntryRevisionInfosRequest>({
    id: tID,
  });

async function entryRevisionFetchResponder(
  viewer: Viewer,
  request: FetchEntryRevisionInfosRequest,
): Promise<FetchEntryRevisionInfosResult> {
  const entryHistory = await fetchEntryRevisionInfo(viewer, request.id);
  return { result: entryHistory };
}

export const createEntryRequestInputValidator: TInterface<CreateEntryRequest> =
  tShape<CreateEntryRequest>({
    text: t.String,
    timestamp: t.Number,
    date: tDate,
    threadID: tID,
    localID: t.maybe(t.String),
    calendarQuery: t.maybe(calendarQueryValidator),
  });

async function entryCreationResponder(
  viewer: Viewer,
  request: CreateEntryRequest,
): Promise<SaveEntryResponse> {
  return await createEntry(viewer, request);
}

export const saveEntryRequestInputValidator: TInterface<SaveEntryRequest> =
  tShape<SaveEntryRequest>({
    entryID: tID,
    text: t.String,
    prevText: t.String,
    timestamp: t.Number,
    calendarQuery: t.maybe(calendarQueryValidator),
  });

async function entryUpdateResponder(
  viewer: Viewer,
  request: SaveEntryRequest,
): Promise<SaveEntryResponse> {
  return await updateEntry(viewer, request);
}

export const deleteEntryRequestInputValidator: TInterface<DeleteEntryRequest> =
  tShape<DeleteEntryRequest>({
    entryID: tID,
    prevText: t.String,
    timestamp: t.Number,
    calendarQuery: t.maybe(calendarQueryValidator),
  });

async function entryDeletionResponder(
  viewer: Viewer,
  request: DeleteEntryRequest,
): Promise<DeleteEntryResponse> {
  return await deleteEntry(viewer, request);
}

export const restoreEntryRequestInputValidator: TInterface<RestoreEntryRequest> =
  tShape<RestoreEntryRequest>({
    entryID: tID,
    timestamp: t.Number,
    calendarQuery: t.maybe(calendarQueryValidator),
  });

async function entryRestorationResponder(
  viewer: Viewer,
  request: RestoreEntryRequest,
): Promise<RestoreEntryResponse> {
  return await restoreEntry(viewer, request);
}

async function calendarQueryUpdateResponder(
  viewer: Viewer,
  request: CalendarQuery,
): Promise<DeltaEntryInfosResult> {
  await verifyCalendarQueryThreadIDs(request);
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const { difference, oldCalendarQuery, sessionUpdate } =
    compareNewCalendarQuery(viewer, request);

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
