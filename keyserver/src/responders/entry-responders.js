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
  rawEntryInfoValidator,
} from 'lib/types/entry-types.js';
import {
  type CalendarFilter,
  calendarThreadFilterTypes,
} from 'lib/types/filter-types.js';
import {
  type FetchEntryRevisionInfosResult,
  type FetchEntryRevisionInfosRequest,
  historyRevisionInfoValidator,
} from 'lib/types/history-types.js';
import { rawMessageInfoValidator } from 'lib/types/message-types.js';
import { serverCreateUpdatesResponseValidator } from 'lib/types/update-types.js';
import { accountUserInfoValidator } from 'lib/types/user-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { tString, tShape, tDate, tID } from 'lib/utils/validation-utils.js';

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
import { validateInput } from '../utils/validation-utils.js';

type EntryQueryInput = {
  +startDate: string,
  +endDate: string,
  +navID?: ?string,
  +includeDeleted?: ?boolean,
  +filters?: ?$ReadOnlyArray<CalendarFilter>,
};
const entryQueryInputValidator: TInterface<EntryQueryInput> = tShape({
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

const newEntryQueryInputValidator: TInterface<CalendarQuery> = tShape({
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

export const fetchEntryInfosResponseValidator: TInterface<FetchEntryInfosResponse> =
  tShape<FetchEntryInfosResponse>({
    rawEntryInfos: t.list(rawEntryInfoValidator),
    userInfos: t.dict(t.String, accountUserInfoValidator),
  });

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

export const fetchEntryRevisionInfosResultValidator: TInterface<FetchEntryRevisionInfosResult> =
  tShape<FetchEntryRevisionInfosResult>({
    result: t.list(historyRevisionInfoValidator),
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

export const saveEntryResponseValidator: TInterface<SaveEntryResponse> =
  tShape<SaveEntryResponse>({
    entryID: tID,
    newMessageInfos: t.list(rawMessageInfoValidator),
    updatesResult: serverCreateUpdatesResponseValidator,
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

export const deleteEntryResponseValidator: TInterface<DeleteEntryResponse> =
  tShape<DeleteEntryResponse>({
    newMessageInfos: t.list(rawMessageInfoValidator),
    threadID: tID,
    updatesResult: serverCreateUpdatesResponseValidator,
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

export const restoreEntryResponseValidator: TInterface<RestoreEntryResponse> =
  tShape<RestoreEntryResponse>({
    newMessageInfos: t.list(rawMessageInfoValidator),
    updatesResult: serverCreateUpdatesResponseValidator,
  });

async function entryRestorationResponder(
  viewer: Viewer,
  input: any,
): Promise<RestoreEntryResponse> {
  const request: RestoreEntryRequest = input;
  await validateInput(viewer, restoreEntryRequestInputValidator, request);
  return await restoreEntry(viewer, request);
}

export const deltaEntryInfosResultValidator: TInterface<DeltaEntryInfosResult> =
  tShape<DeltaEntryInfosResult>({
    rawEntryInfos: t.list(rawEntryInfoValidator),
    deletedEntryIDs: t.list(tID),
    userInfos: t.dict(t.String, accountUserInfoValidator),
  });

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
