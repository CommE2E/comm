// @flow

import type { Viewer } from '../session/viewer';
import type {
  CalendarQuery,
  SaveEntryRequest,
  CreateEntryRequest,
  DeleteEntryRequest,
  DeleteEntryResponse,
  RestoreEntryRequest,
  RestoreEntryResponse,
  FetchEntryInfosResponse,
  SaveEntryResult,
} from 'lib/types/entry-types';
import type {
  FetchEntryRevisionInfosResult,
  FetchEntryRevisionInfosRequest,
} from 'lib/types/history-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/errors';
import { threadPermissions } from 'lib/types/thread-types';

import { validateInput, tShape, tDate } from '../utils/validation-utils';
import { verifyThreadID } from '../fetchers/thread-fetchers';
import {
  fetchEntryInfos,
  fetchEntryRevisionInfo,
} from '../fetchers/entry-fetchers';
import createEntry from '../creators/entry-creator';
import { updateEntry } from '../updaters/entry-updaters';
import { deleteEntry, restoreEntry } from '../deleters/entry-deleters';

const entryQueryInputValidator = tShape({
  navID: t.String,
  startDate: tDate,
  endDate: tDate,
  includeDeleted: t.maybe(t.Boolean),
});

async function entryFetchResponder(
  viewer: Viewer,
  input: any,
): Promise<FetchEntryInfosResponse> {
  const request: CalendarQuery = input;
  validateInput(entryQueryInputValidator, request);

  let validNav = request.navID === "home";
  if (!validNav) {
    validNav = await verifyThreadID(request.navID);
  }
  if (!validNav) {
    throw new ServerError('invalid_parameters');
  }

  return await fetchEntryInfos(viewer, request);
}

const entryRevisionHistoryFetchInputValidator = tShape({
  id: t.String,
});

async function entryRevisionFetchResponder(
  viewer: Viewer,
  input: any,
): Promise<FetchEntryRevisionInfosResult> {
  const request: FetchEntryRevisionInfosRequest = input;
  validateInput(entryRevisionHistoryFetchInputValidator, request);
  const entryHistory = await fetchEntryRevisionInfo(viewer, request.id);
  return { result: entryHistory };
}

const createEntryRequestInputValidator = tShape({
  text: t.String,
  sessionID: t.String,
  timestamp: t.Number,
  date: tDate,
  threadID: t.String,
});

async function entryCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<SaveEntryResult> {
  const request: CreateEntryRequest = input;
  validateInput(createEntryRequestInputValidator, request);
  return await createEntry(viewer, request);
}

const saveEntryRequestInputValidator = tShape({
  entryID: t.String,
  text: t.String,
  prevText: t.String,
  sessionID: t.String,
  timestamp: t.Number,
});

async function entryUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<SaveEntryResult> {
  const request: SaveEntryRequest = input;
  validateInput(saveEntryRequestInputValidator, request);
  return await updateEntry(viewer, request);
}

const deleteEntryRequestInputValidator = tShape({
  entryID: t.String,
  prevText: t.String,
  sessionID: t.String,
  timestamp: t.Number,
});

async function entryDeletionResponder(
  viewer: Viewer,
  input: any,
): Promise<DeleteEntryResponse> {
  const request: DeleteEntryRequest = input;
  validateInput(deleteEntryRequestInputValidator, request);
  return await deleteEntry(viewer, request);
}

const restoreEntryRequestInputValidator = tShape({
  entryID: t.String,
  sessionID: t.String,
  timestamp: t.Number,
});

async function entryRestorationResponder(
  viewer: Viewer,
  input: any,
): Promise<RestoreEntryResponse> {
  const request: RestoreEntryRequest = input;
  validateInput(restoreEntryRequestInputValidator, request);
  return await restoreEntry(viewer, request);
}

export {
  entryQueryInputValidator,
  entryFetchResponder,
  entryRevisionFetchResponder,
  entryCreationResponder,
  entryUpdateResponder,
  entryDeletionResponder,
  entryRestorationResponder,
};
